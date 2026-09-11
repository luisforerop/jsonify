# Relationships Feature: Design Feedback & Resolutions

**Date:** 2026-09-11  
**Status:** All critical gaps addressed before implementation  
**Source:** Architecture review by external agent

---

## Executive Summary

External technical review identified **4 critical gaps** in the Phase 1 design. All gaps have been **analyzed and resolved** with explicit solutions documented in updated artifacts.

**Verdict from Reviewer:** Design is now 100% ready for implementation (was 90% before feedback).

---

## Gaps Identified & Resolutions

### Gap 1: Payload Consistency After Cascade Delete ✅ RESOLVED

**Issue:**
When a target record is deleted (e.g., Usuario), the `relationships` table row cascades, but the source record's JSONB still contains the stale UUID (e.g., `"autor": "uuid-of-deleted-user"`).

**Impact:**
- Form filler tries to display name → null/404
- API returns dangling reference
- Inconsistent state between payload and relationships table

**Resolution Chosen:**
Implement **lazy cleanup strategy**:
1. Allow stale UUID to remain in payload (no database trigger complexity)
2. When rendering form: filter out invalid references with:
   ```typescript
   const author = authorUUID ? await recordRepository.findById(authorUUID) : null;
   if (!author || author.schemaId !== expectedSchemaId) {
     return null; // Don't display broken reference
   }
   ```
3. Add maintenance task in Phase 2+ for periodic cleanup

**Why Not Eager Cleanup?**
- Would require Postgres trigger on cascade delete
- Triggers add complexity and slow deletions
- Lazy cleanup is sufficient for UX

**Updated In:** `design.md` → "Critical Gaps to Resolve" section

**Tasks Updated:**
- 3.7: Add lazy cleanup logic when rendering forms/API
- 6.7: Test lazy cleanup scenario

---

### Gap 2: One-to-One Uniqueness Constraint (Bidirectional) ✅ RESOLVED

**Issue:**
Original unique constraint only prevented source having multiple targets, but allowed multiple sources pointing to same target.

**Bad Scenario:**
- Perfil_1 → Usuario_A (valid 1:1)
- Perfil_2 → Usuario_A (INVALID, should be rejected but wasn't)

**Resolution Chosen:**
Two-pronged enforcement:

1. **Database level (partial unique indexes):**
   ```sql
   CREATE UNIQUE INDEX relationships_one_to_one_source_uq
   ON relationships(sourceSchemaId, targetSchemaId, sourceRecordId)
   WHERE relationshipType = 'one-to-one';
   
   CREATE UNIQUE INDEX relationships_one_to_one_target_uq
   ON relationships(sourceSchemaId, targetSchemaId, targetRecordId)
   WHERE relationshipType = 'one-to-one';
   ```

2. **Application level in `validate-payload.ts`:**
   ```typescript
   if (relationshipType === 'one-to-one') {
     // Check: does ANY other record already point to this target?
     const existing = await relationshipRepository.findByTargetId(targetRecordId);
     if (existing && existing.sourceRecordId !== newRecord.id) {
       throw new DuplicateRelationshipError("Target already referenced by another 1:1");
     }
   }
   ```

**Trade-off:** One extra query per 1:1 creation, but ensures data integrity.

**Updated In:**
- `specs/schema-relationships/storage/spec.md` → New requirement with scenarios
- `design.md` → "Critical Gaps: Gap 2" section
- `tasks.md` → 3.5 (bidirectional validation)

**Tasks Updated:**
- 3.5: Bidirectional 1:1 validation
- 6.6: Test both source and target uniqueness

---

### Gap 3: Dropdown Performance Limit ✅ RESOLVED

**Issue:**
Rendering `<select>` with 2000+ records crashes browser and balloons network payload.

**Solution Chosen:**
Implement **hard limit with affordance**:

1. **Hard limit: Fetch max 50 records**
   ```typescript
   const records = await recordRepository.listBySchema(schemaId, { limit: 50 });
   ```

2. **UI Message:** Show "Showing 50 of 342 records. Start typing to search..."

3. **Client-side filter (Phase 1):**
   ```typescript
   const filtered = records.filter(r => 
     r.payload[displayField].includes(searchTerm)
   );
   ```

4. **Server-side search deferred to Phase 2**

**Updated In:**
- `design.md` → "Critical Gaps: Gap 3" section
- `tasks.md` → 5.1, 5.2, 5.3

**Tasks Updated:**
- 5.1: Implement LIMIT 50
- 5.2: Show record count message
- 5.3: Client-side filter
- 6.9, 6.10: Tests for limit and message

---

### Gap 4: Array Relation Validation (Atomicity) ✅ RESOLVED

**Issue:**
When creating record with array relations (e.g., `"ingredientes": ["uuid-1", "uuid-2", "uuid-3"]`), must validate ALL UUIDs and create ALL relationship entries atomically.

**Risk:** Partial success (record created, some relationships created, some failed).

**Solution Chosen:**
Wrap validation + creation in database transaction:

```typescript
await db.transaction(async (tx) => {
  // 1. Validate ALL array items
  const relationArray = payload[fieldName];
  if (Array.isArray(relationArray)) {
    for (const uuid of relationArray) {
      const target = await tx.select().from(records).where(eq(records.id, uuid));
      if (!target || target.schemaId !== targetSchemaId) {
        throw new ValidationError(`Invalid relation: ${uuid}`);
      }
    }
  }
  
  // 2. Create record
  const record = await tx.insert(records).values(recordData);
  
  // 3. Create all relationships (success or all rollback)
  for (const uuid of relationArray) {
    await tx.insert(relationships).values({
      sourceRecordId: record.id,
      targetRecordId: uuid,
      // ...
    });
  }
});
```

**Updated In:**
- `design.md` → "Critical Gaps: Gap 4" section
- `tasks.md` → 3.4

**Tasks Updated:**
- 3.4: Transactional wrapper
- 6.5: Test transaction rollback scenario

---

## Clarifications on Design Choices

### Decision: Remove `relationshipType` from Table

**Feedback:** Storing cardinality in relationships table is redundant (already in schema).

**Decision:** **REMOVE** `relationshipType` from relationships table schema.

**Rationale:**
- Cardinality is a **schema property**, not per-relationship
- Application looks up schema once to understand type
- Reduces table size and index complexity
- Future queries don't need it

**What Changed:**
- Database schema: Only `id`, `sourceRecordId`, `targetRecordId`, `sourceSchemaId`, `targetSchemaId`, `collectionId`, timestamps
- Relationship validation logic still understands cardinality by reading schema

**Updated In:**
- `specs/schema-relationships/storage/spec.md` → Clarification added
- `design.md` → "Clarifications" section
- `tasks.md` → 1.1 (no relationshipType column), 1.3 (type definition)

---

## Summary of Artifact Updates

| Artifact | Changes |
|----------|---------|
| `design.md` | Added "Critical Gaps to Resolve" section with 4 detailed problems + solutions |
| `design.md` | Added "Clarifications" section explaining relationshipType removal |
| `design.md` | Moved "Open Questions" to lower priority |
| `specs/.../storage/spec.md` | Updated Requirement: added NOTE about relationshipType |
| `specs/.../storage/spec.md` | New Requirement: bidirectional 1:1 uniqueness with 3 scenarios |
| `tasks.md` | 1.1-1.6: Updated database tasks (no relationshipType, bidirectional validation) |
| `tasks.md` | 3.1-3.9: Extended validation tasks (transactionality, lazy cleanup, array handling) |
| `tasks.md` | 5.1-5.9: Added UI affordances (50-record limit, "Showing X of Y" message) |
| `tasks.md` | 6.1-6.12: Added tests for transactionality, stale refs, 1:1 uniqueness, limits |

---

## Readiness Assessment

### Pre-Implementation Checklist

- [x] All 4 critical gaps analyzed and resolved
- [x] Lazy cleanup strategy chosen for stale references
- [x] Bidirectional 1:1 uniqueness enforced (DB + app level)
- [x] Dropdown performance capped at 50 records
- [x] Transaction atomicity for array relations guaranteed
- [x] Redundant `relationshipType` column removed
- [x] Specs updated to reflect clarifications
- [x] Tasks breakdown now includes all critical paths
- [x] No blocking open questions remain for Phase 1

### Go/No-Go

**Status:** ✅ **GO** — All critical gaps resolved. Design is complete and ready for implementation.

---

## Lessons for Future Phases

When planning Phase 2+, remember:

1. **Server-side search for dropdowns** (deferred from Phase 1)
2. **Relationship querying APIs** (build on Phase 1 relationships table)
3. **Soft delete strategy** (decide on GDPR compliance first)
4. **Polymorphic relations** (design multi-schema references)

Refer to `relationships-phase-1-boundaries.md` for full Phase 2+ roadmap.
