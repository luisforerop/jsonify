## Context

Jsonify currently models data with schemas (JSON Schema definitions) and records (instances). To enable relationships, we need:
1. A way for users to define which schemas reference which other schemas
2. Storage and validation of those connections
3. UI rendering that makes relationships intuitive

The platform uses PostgreSQL + Drizzle ORM for persistence, Next.js for the app, and the schema builder uses a custom `BuilderNode` tree structure before converting to JSON Schema. Record payloads are stored as JSONB in Postgres.

See `RELATIONSHIPS_FEATURE.md` for the full problem analysis and three architectural options evaluated. We're adopting the **Hybrid Approach (Option A UI + Option B Storage)**.

## Goals / Non-Goals

**Goals:**
- Enable users to create relation fields in schemas and define target schemas
- Auto-render relation fields as dropdowns/multi-selects in forms based on cardinality
- Validate that related records exist and belong to the correct schema
- Store relationship connections for efficient queries and cascade operations
- Maintain JSON Schema standard compliance using `x-relation` metadata
- Support all cardinality types: one-to-one, one-to-many, many-to-one, many-to-many
- Support both single relations and array relations (many)

**Non-Goals:**
- Querying records filtered by relationships (Phase 3 future work)
- Polymorphic relations (referencing any schema) - initially limited to one target schema per field
- Computed/aggregated fields based on relations
- API query parameters for relationship filtering
- Soft delete behavior for relationships

## Decisions

### Decision 1: Store relation type in UI builder, convert to JSON Schema on save

**Chosen Approach:**
- UI presents "relation" as a native type in `BuilderNode` with `relationConfig` properties
- On save, convert to standard JSON Schema: `type: "string", format: "uuid", x-relation: {...}`
- Array relations stored as `type: "array", items: { type: "string", format: "uuid", x-relation: {...} }`

**Rationale:**
- UI is clearer: users see "relation" not "string with UUID metadata"
- Storage is standards-compliant: external tools can read the schema
- Bidirectional: can re-import and detect relations by `x-relation` metadata

**Alternative Considered:**
- Store relation as native JSON Schema type (`type: "relation"`) - cleaner storage but violates JSON Schema standard

### Decision 2: Separate `relationships` table vs. embedded in record payload

**Chosen Approach:**
- Create dedicated `relationships` table that tracks every connection
- Record payload stores UUIDs (e.g., `"autor": "uuid-123"`)
- `relationships` table enables: cascade delete, efficient queries, relationship history/auditing

**Rationale:**
- Cleaner semantics: payload has data, relationships table has connections
- Enables cascade delete atomically (if User record deleted, all recipes pointing to it are cleaned)
- Future-proof for queries like "find all recipes by this user" or "show me relationship metadata"
- Separate concerns: record data vs. relationship graph

**Alternative Considered:**
- Store only UUIDs in payload, no relationships table - simpler but loses cascade and audit capability

### Decision 3: Validation on record create/update

**Chosen Approach:**
- In `validate-payload.ts`, when a field has `x-relation`, fetch the target record and verify:
  1. Target record exists (not null)
  2. Target record belongs to the target schema (schemaId matches)
- If valid, create relationship entry
- If invalid, reject record with specific error

**Rationale:**
- Early validation prevents invalid state
- Relationship entry created atomically with record save
- Clear error messages guide users

**Alternative Considered:**
- Lazy validation (check on query) - risks orphaned UUIDs in payloads

### Decision 4: Form rendering with record selector component

**Chosen Approach:**
- Form filler detects `x-relation` metadata
- For single relation: render dropdown with all target records
- For array relation: render multi-select with all target records
- Display using the configured `displayField` (e.g., show "Luis" not "uuid-123")

**Rationale:**
- Intuitive UX: dropdown/multi-select is standard for choosing related items
- Avoids exposing UUIDs to users
- Cardinality automatically inferred from schema structure (field vs. array)

**Alternative Considered:**
- Search/autocomplete instead of full dropdown - better for large record sets, deferred to Phase 3

### Decision 5: Database schema and cascades

**Chosen Approach:**
```
relationships {
  id, collectionId, sourceSchemaId, targetSchemaId,
  relationshipType, sourceRecordId, targetRecordId,
  createdAt, updatedAt
}
Indexes: sourceRecordId, targetRecordId
Cascades: ON DELETE records, cascade delete relationships
```

**Rationale:**
- Full audit trail with timestamps
- Indexes enable fast queries in both directions
- Cascade ensures no orphaned relationships when records deleted

**Alternative Considered:**
- Store relationship info in record.payload directly - loses queryability and cascade

### Decision 6: One-to-one uniqueness constraint

**Chosen Approach:**
- For one-to-one relationships, add unique constraint on (sourceSchemaId, targetSchemaId, sourceRecordId)
- Prevents duplicate one-to-one relationships for the same source record

**Rationale:**
- One-to-one semantics: a User can have only ONE primary address
- Many-to-many has no uniqueness constraint: allowed

**Alternative Considered:**
- No constraint - simpler but allows invalid one-to-one data

## Risks / Trade-offs

**Risk: N+1 queries when loading form**
- **Impact**: If schema has 5 relation fields and each needs to load all target records, can be slow
- **Mitigation**: Lazy-load or cache target records; Phase 3 can add pagination/search UI

**Risk: Cascade delete of relationships may be unexpected**
- **Impact**: User deletes a Usuario record; all Receta records keep the UUID but relationship entry is gone
- **Mitigation**: Clear UI language ("Deleting this record will remove all relationships"); audit log

**Risk: Schema migration for existing projects**
- **Impact**: Existing projects have no relationships; adding relation fields is new behavior
- **Mitigation**: Schema change is additive; existing records/schemas unaffected

**Risk: JSON Schema standard compatibility**
- **Impact**: `x-relation` is a custom extension, external tools might not understand it
- **Mitigation**: Acceptable trade-off; extension is ignored, schema remains valid

**Risk: Relationship cardinality enforcement**
- **Impact**: Only one-to-one is strictly enforced (uniqueness); others are advisory
- **Mitigation**: Document that many-to-many is user-enforced via schema design; consider validation layer in Phase 3

## Migration Plan

### Deploy Steps
1. **Database migration**: Add `relationships` table (new, no data)
2. **Code deploy**: New repository layer, schema builder changes, form renderer changes
3. **UI release**: New "relation" type visible in schema builder
4. **Feature rollout**: Relation type enabled in UI (can be hidden behind flag if needed)

### Rollback Strategy
1. Remove relationships table (FK cascade handles cleanup)
2. Schema builder still renders `x-relation` metadata (just can't edit it)
3. Form filler treats `x-relation` as optional; falls back to UUID input if relation rendering not available
4. No data loss: record payloads and schemas unchanged

### Phased Rollout (optional)
- Enable for new collections only (canary)
- Enable for existing collections after validation
- Monitor relationship table growth and query performance

## Critical Gaps to Resolve (Before Implementation)

### Gap 1: Payload Consistency After Cascade Delete

**The Problem:**
When a target record is deleted (e.g., deleting a Usuario), the `relationships` table row is cascade-deleted via FK. However, the source record's JSONB payload still contains the stale UUID reference (e.g., `"autor": "uuid-of-deleted-usuario"`).

**Scenario:**
1. Receta_A has `"autor": "user-123"`
2. Relationship entry: `sourceRecordId=receta-a, targetRecordId=user-123`
3. User deletes Usuario with id=user-123
4. Cascade delete removes the relationship entry
5. **Problem:** Receta_A's payload still has `"autor": "user-123"`, but the record no longer exists

**Impact:**
- Form filler tries to display the author name → null/404
- API returns a payload with a dangling UUID
- Potential confusion or errors in downstream systems

**Solution (CHOSEN for Phase 1):**
Implement a **lazy cleanup strategy**:
- Allow the stale UUID to remain in the payload
- When rendering a form or returning via API, filter out invalid references:
  ```typescript
  // In form-filler rendering logic:
  const author = authorUUID ? await recordRepository.findById(authorUUID) : null;
  if (!author || author.schemaId !== expectedSchemaId) {
    // Show empty/null in UI; do not display broken reference
    return null;
  }
  return author;
  ```
- Add a **maintenance task** to periodically clean stale references (Phase 2+)

**Alternative (stricter, deferred to Phase 2):**
- Add a Postgres trigger to update the JSONB payload when cascade delete occurs
- Trade-off: More database logic, slower deletes, but guarantees consistency

**Chosen:** Lazy cleanup + UI graceful degradation. No trigger in Phase 1 to keep deployment simple.

---

### Gap 2: One-to-One Uniqueness Constraint (Bidirectional)

**The Problem:**
The proposed unique constraint `(sourceSchemaId, targetSchemaId, sourceRecordId)` only prevents a **source record from having multiple targets** (e.g., Receta can't have 2 authors).

**It does NOT prevent:**
Multiple source records pointing to the same target (e.g., Receta_A and Receta_B both claiming "author = user-123").

**Solution (CHOSEN for Phase 1):**
Two-pronged approach:

1. **Database constraint:** Add a partial unique index for one-to-one relationships:
   ```sql
   CREATE UNIQUE INDEX relationships_one_to_one_uq
   ON relationships(sourceSchemaId, targetSchemaId, sourceRecordId)
   WHERE relationshipType = 'one-to-one'
   AND relationships.id IS NOT NULL;
   
   -- ALSO add a reverse constraint to prevent multiple sources:
   CREATE UNIQUE INDEX relationships_one_to_one_target_uq
   ON relationships(sourceSchemaId, targetSchemaId, targetRecordId)
   WHERE relationshipType = 'one-to-one'
   AND relationships.id IS NOT NULL;
   ```

2. **Application-level validation in `validate-payload.ts`:**
   ```typescript
   if (relationshipType === 'one-to-one') {
     // Check: does ANY other record already point to this target?
     const existing = await relationshipRepository.findRelationship(
       null, // Any source
       targetRecordId
     );
     if (existing) {
       throw new DuplicateRelationshipError(
         `Target record is already referenced by another 1:1 relation`
       );
     }
   }
   ```

**Tradeoff:** Stricter validation at cost of one extra query per 1:1 relation creation. Acceptable for Phase 1.

---

### Gap 3: Dropdown Performance Limit

**The Problem:**
Rendering a `<select>` with all records from a target schema will crash the browser if the schema has > 100 records. React will struggle, network payload balloons, API returns slowdown.

**Solution (CHOSEN for Phase 1):**
Implement a **hard limit with fallback**:

1. **Hard limit: Fetch max 50 records** for the initial dropdown load:
   ```typescript
   const targetRecords = await recordRepository.listBySchema(
     relationConfig.referencedSchemaId,
     { limit: 50 }
   );
   ```

2. **UI affordance:** If > 50 records exist, show message:
   ```
   "Showing 50 of 342 records. Start typing to search..."
   ```

3. **Fallback to searchable input:** When user types, client-side filter or server-side search (defer server-side to Phase 2):
   ```typescript
   // Phase 1: Client-side filtering
   const filtered = targetRecords.filter(r => 
     r.payload[displayField].toLowerCase().includes(searchTerm)
   );
   ```

**Document in tasks.md:** Add task to implement this limit.

---

### Gap 4: Array Relation Validation (Atomicity)

**The Problem:**
When creating a record with an array of relations (e.g., `"ingredientes": ["uuid-1", "uuid-2", "uuid-3"]`), the validator must:
1. Check ALL UUIDs exist
2. Create ALL relationship entries
3. Do this **atomically** — either all succeed or all fail

**Solution (CHOSEN for Phase 1):**
Wrap validation and relationship creation in a database transaction:

```typescript
// In validate-payload.ts
await db.transaction(async (tx) => {
  // 1. Validate all array items first
  const relationArray = payload[fieldName];
  if (Array.isArray(relationArray)) {
    for (const uuid of relationArray) {
      const target = await tx.select().from(records).where(eq(records.id, uuid));
      if (!target || target.schemaId !== targetSchemaId) {
        throw new ValidationError(`Invalid relation at index: ${uuid}`);
      }
    }
    
    // 2. Create record (will succeed now)
    const newRecord = await tx.insert(records).values(recordData);
    
    // 3. Create all relationship entries
    for (const uuid of relationArray) {
      await tx.insert(relationships).values({
        sourceRecordId: newRecord.id,
        targetRecordId: uuid,
        // ...
      });
    }
  }
});
```

**Task to add:** Ensure validation tests cover array relations + rollback scenarios.

---

## Clarifications on Design Decisions

### Should `relationshipType` be stored in `relationships` table?

**Feedback:** It's redundant since cardinalitiy is a schema property, not per-instance.

**Decision:** **REMOVE it from the table.** The relationship table only needs:
- `id`, `sourceRecordId`, `targetRecordId`, `sourceSchemaId`, `targetSchemaId`, `collectionId`, timestamps

**Rationale:**
- Cardinalitiy is schema-level; store it in `x-relation` metadata
- Future queries won't need to know cardinality from the relationships table
- Reduces table width, simplifies indices
- Application logic looks up schema once to understand cardinality

**Update:** Revise database schema task to remove this column.

---

## Open Questions (Lower Priority, Deferrable)

1. **Bulk operations**: Should bulk record import/export support relationships? Deferred to Phase 2.
2. **Relationship API**: Will public API expose relationship queries? Deferred to Phase 3.
3. **Circular relationships**: Should we prevent schema A → B → A cycles? Deferred; can be validated at schema save time if needed.
4. **Cross-collection relationships**: Initially relationships are within one collection. Cross-collection references require scope change; deferred pending product decision.
5. **Webhook events:** Should relationship creation/deletion trigger webhooks? Deferred to Phase 3.
