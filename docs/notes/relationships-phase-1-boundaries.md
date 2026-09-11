# Relationships Feature: Phase 1 Boundaries & Future Considerations

**Document Purpose:** Clarify what's NOT implemented in Phase 1 of the relationships feature, but should be considered for future phases. Includes definitions and architectural notes for continuity.

**Last Updated:** 2026-09-11  
**Phase:** 1 (Foundation) — In Development

---

## Out of Scope for Phase 1 (But Planned)

### 1. Relationship Querying & Filtering

**What it is:**
The ability to search, filter, and retrieve records based on their relationships. Examples:
- "Find all Recetas where autor.nombre = 'Luis'"
- "Find all Usuarios who have more than 3 Recetas"
- API: `GET /records?filter[relatedTo]=user-123`
- Faceted search: "Show recipes grouped by author"

**Why deferred to Phase 2/3:**
- Requires complex SQL JOINs or specialized query engines
- Needs query builder UI (no users asking for it yet in Phase 1)
- Performance considerations at scale (indexing strategies)
- API design decisions still needed (query language, syntax, pagination)

**How to build it later:**
```typescript
// Future API might look like:
const recetas = await recordRepository.findByRelation({
  schemaId: "receta-schema",
  relationField: "autor",
  targetRecordId: "user-123"
});

// Or with a query builder:
db.select()
  .from(records)
  .where(
    records.schemaId === "receta",
    relationships.targetRecordId === "user-123"
  )
  .join(relationships)
```

**Dependency graph:**
- Requires: Relationship storage (Phase 1 ✓) + query repository methods
- Enables: Advanced filtering UI, API endpoints, analytics

---

### 2. Polymorphic Relationships

**What it is:**
A single relation field that can reference **any of multiple schemas** instead of exactly one. Example:
```json
{
  "fieldName": "owner",
  "type": "relation",
  "canReference": ["Usuario", "Bot", "Organization"],
  "displayField": "name"
}
```

**Current limitation (Phase 1):**
Each relation field points to exactly ONE target schema. If you need flexibility:
```json
// Instead of polymorphic:
{
  "ownerUsuario": { "type": "relation", "references": "Usuario" },
  "ownerBot": { "type": "relation", "references": "Bot" }
}
```

**Why deferred:**
- UI complexity: dropdown can't know which records to show without schema context
- Validation complexity: "Is this UUID a valid Usuario or Bot?"
- Storage complexity: relationship table needs `targetSchemaId`, becomes ambiguous
- Rare use case until platform matures

**How to build it later:**
```typescript
// Schema definition would need:
relationConfig: {
  referencedSchemaIds: ["usuario-id", "bot-id"], // Multiple targets
  displayFieldPerSchema: {
    "usuario-id": "nombre",
    "bot-id": "botName"
  }
}

// Validation logic:
const targetRecord = await recordRepository.findById(value);
const validSchemas = relationConfig.referencedSchemaIds;
if (!validSchemas.includes(targetRecord.schemaId)) {
  throw new ValidationError("Record belongs to invalid schema");
}
```

**Dependency graph:**
- Requires: Relationship definition & storage (Phase 1 ✓)
- Blocks: Advanced schema modeling use cases

---

### 3. Computed/Derived Fields

**What it is:**
Auto-calculated fields based on relationships, like:
- `recipeCount`: Number of Recetas authored by a Usuario (computed from relationships)
- `totalCost`: Sum of ingredient costs for a Receta
- `lastModifiedRecipe`: Most recent Receta by author

```json
{
  "fieldName": "recipeCount",
  "type": "computed",
  "computationType": "COUNT",
  "basedOn": {
    "relationField": "recipes",
    "count": true
  }
}
```

**Current limitation (Phase 1):**
No computed fields. If you need this, calculate in your application:
```typescript
// Client-side calculation
const usuario = await loadRecord(usuarioId);
const recetas = await loadRecordsByRelation(usuarioId, "Receta");
usuario.recipeCount = recetas.length;
```

**Why deferred:**
- Requires formula/expression engine (security risk if user-provided)
- Caching strategy: when are computed values refreshed?
- Performance: every read would trigger computation
- Better as API endpoint or client-side logic for now

**How to build it later:**
```typescript
// Phase 3: Computed field repository
interface ComputedFieldDefinition {
  name: string;
  type: "COUNT" | "SUM" | "AVG" | "MAX" | "MIN";
  relationshipField: string;
  aggregateOn?: string; // Field to sum/avg if not just count
}

// On record load:
record.computedFields = await computeFields(record, schema);
```

**Dependency graph:**
- Requires: Relationship querying (Phase 2) + computed field definitions
- Enables: Analytics, dashboards, summaries

---

### 4. API Query Parameters for Relationships

**What it is:**
The public API to support relationship-aware queries:
```bash
# Expand related records into response
GET /api/collections/{collectionId}/records?schemaId=receta&expand=autor

# Filter by relationship
GET /api/collections/{collectionId}/records?schemaId=receta&filter[autor.id]={userId}

# Relationships metadata endpoint
GET /api/collections/{collectionId}/records/{id}/relationships

# Create relationship via API
POST /api/collections/{collectionId}/relationships
{
  "sourceRecordId": "...",
  "targetRecordId": "...",
  "relationshipType": "many-to-one"
}
```

**Current limitation (Phase 1):**
API only handles simple CRUD on records. Relationships exist internally but aren't exposed via API.

**Why deferred:**
- Requires relationship querying (Phase 2) first
- API design decisions: which endpoints, which parameters, error handling
- Breaking change: might affect existing API consumers
- Documentation and versioning needed

**How to build it later:**
```typescript
// Phase 3: Relationship API endpoints
export const GET /api/collections/[collectionId]/records/[recordId]/relationships
// Returns: { relationships: [...], relatedRecords: {...} }

export const GET /api/collections/[collectionId]/records?expand=authorId
// Returns: record with full author object embedded
```

**Dependency graph:**
- Requires: Relationship querying (Phase 2) + design decisions
- Enables: Programmatic access to relational data, integrations

---

### 5. Soft Delete & Record Restoration

**What it is:**
Instead of permanent deletion, records are marked as deleted but retained:
```json
{
  "id": "user-123",
  "deletedAt": "2026-09-11T10:30:00Z",
  "name": "Luis",
  "isDeleted": true
}
```

Relationships to deleted records:
- Remain intact (allows restoration)
- Hidden from UI dropdowns
- Can be un-deleted atomically

**Current behavior (Phase 1):**
Deletes are **hard deletes** — records are gone forever, and cascade deletes all relationships. No recovery.

**Why deferred:**
- Adds significant complexity: every query must filter `WHERE deletedAt IS NULL`
- Requires restoration/undelete features and UI
- Affects relationship validity: should deleted records be selectable? Visible?
- Compliance consideration: GDPR "right to be forgotten" vs. soft deletes
- Storage overhead: accumulates deleted records

**How to build it later:**
```typescript
// Schema & data model changes
interface Record {
  id: string;
  payload: Record<string, unknown>;
  deletedAt?: Date; // null = not deleted
  deletedBy?: string; // audit trail
}

// Repository methods
interface RecordRepository {
  softDelete(id: string): Promise<void>; // Sets deletedAt
  restore(id: string): Promise<void>; // Clears deletedAt
  listIncludingDeleted(): Promise<Record[]>; // For admins/audit
}

// Query builder
db.select()
  .from(records)
  .where(eq(records.deletedAt, null)); // Automatically filter
```

**Dependency graph:**
- Requires: Design decisions on GDPR, compliance, UI flows
- Blocks: Enterprise features, compliance-heavy use cases

---

## Key Definitions & Concepts

### Cardinality Types

**One-to-One (1:1)**
- Source record relates to exactly ONE target record
- Example: User → Primary Address
- Uniqueness: enforced (cannot have duplicate relations)
- UI: Dropdown (single select)
- Storage: Single UUID in payload

```
Usuario (1) ─────── (1) ProfileBio
luis          has one      "My bio..."
```

**One-to-Many (1:N)**
- Source record relates to MULTIPLE target records
- Example: Receta → Many Ingredientes
- Uniqueness: not enforced (can add same ingredient multiple times)
- UI: Multi-select
- Storage: Array of UUIDs in payload

```
Receta (1) ─────── (N) Ingrediente
pasta       contains    [pasta, eggs, bacon]
```

**Many-to-One (N:1)**
- MULTIPLE source records relate to ONE target record
- Example: Many Recetas → One Usuario (author)
- Uniqueness: not enforced on source side (multiple recipes from one author)
- UI: Dropdown (single select)
- Storage: Single UUID per record

```
Receta (N) ─────── (1) Usuario
[pasta, pizza]    author  luis
```

**Many-to-Many (M:N)**
- Multiple sources relate to multiple targets
- Example: Recetas ↔ Tags (a recipe has many tags, a tag used by many recipes)
- Uniqueness: depends on use case
- UI: Multi-select
- Storage: Currently array of UUIDs (junction table for phase 2+)

```
Receta (N) ─────── (M) Tag
[pasta, pizza]         [italian, quick, vegan]
```

### Relationship Record

**Data structure in `relationships` table:**
```typescript
interface Relationship {
  id: string;                    // UUID, unique identifier
  collectionId: string;          // Which workspace collection
  sourceSchemaId: string;        // Schema of source record
  targetSchemaId: string;        // Schema of target record
  sourceRecordId: string;        // The record defining the relation
  targetRecordId: string;        // The record being referenced
  relationshipType: string;      // "one-to-one" | "one-to-many" | ...
  createdAt: Date;              // Audit: when created
  updatedAt: Date;              // Audit: when changed
}
```

**Purpose:**
- Enables reverse lookups: "Which Usuarios authored Recetas?"
- Cascade operations: "Delete User → clean up all relationships"
- Future queries: "All records related to X"
- Audit trail: who created/modified relationships

### x-relation Metadata

**Location:** Inside JSON Schema definition as custom extension

**Structure:**
```json
{
  "type": "string",
  "format": "uuid",
  "x-relation": {
    "schemaId": "schema-uuid",
    "schemaName": "TargetSchema",
    "relationshipType": "many-to-one",
    "displayField": "name"
  }
}
```

**For array relations:**
```json
{
  "type": "array",
  "items": {
    "type": "string",
    "format": "uuid",
    "x-relation": { /* same as above */ }
  }
}
```

**Purpose:**
- Tells form filler: "render as relationship selector"
- Standards-compliant: `x-` prefix is JSON Schema extension convention
- Portable: can export/import schemas with relations
- Self-documenting: schema contains full relationship info

---

## Architectural Dependencies

### Dependency Graph (Phases)

```
Phase 1: Foundation ✓ (Current)
├── Relationship definition & UI
├── Schema builder + relation type
├── Validation & storage
└── Form rendering with selectors

Phase 2: Querying
├── Relationship queries (find records by relation)
├── API endpoints for relationships
├── Computed fields (depends on querying)
└── Advanced UI (filtering, faceting)

Phase 3: Maturity
├── Polymorphic relations
├── Soft delete with restoration
├── Relationship lifecycle (webhooks, events)
└── Analytics & reporting
```

### What Can't Be Done Without Previous Phases

| Feature | Requires | Impact |
|---------|----------|--------|
| Filtering by relations | Phase 1 + Phase 2 queries | Can't query "Recetas by Luis" |
| Computed fields | Phase 2 queries | Must calculate in app |
| API relationship endpoints | Phase 2 + API design | No public relationship API |
| Soft delete | Design decisions | Deletes are permanent |
| Polymorphic relations | None, independent | Relations are 1:1 target schema |

---

## Future Implementation Checklist

When starting Phase 2+, reference this before coding:

- [ ] **Querying Phase:**
  - [ ] Add repository methods: `findRecordsRelatedTo()`, `listRelationships()`
  - [ ] Design query syntax/API (SQL-like filters, GraphQL, simple params?)
  - [ ] Implement indexes for efficient queries
  - [ ] Test performance with large relationship sets

- [ ] **API Phase:**
  - [ ] Design endpoint structure (where do relationship endpoints live?)
  - [ ] Decide: expand related records or separate calls?
  - [ ] Handle pagination for large relationship sets
  - [ ] Write API documentation & examples

- [ ] **Computed Fields Phase:**
  - [ ] Define allowed operations (COUNT, SUM, AVG, custom?)
  - [ ] Build expression/formula parser
  - [ ] Decide: compute on read, batch compute, cache?
  - [ ] Handle stale data & refresh strategy

- [ ] **Polymorphic Relations Phase:**
  - [ ] Update relationship table to support multiple target schemas
  - [ ] Refactor validation logic
  - [ ] Design UI for multi-schema selection
  - [ ] Test schema resolution performance

- [ ] **Soft Delete Phase:**
  - [ ] Add `deletedAt` column to records table
  - [ ] Refactor all queries to filter deleted records
  - [ ] Add restore/undelete endpoints
  - [ ] Decide GDPR compliance strategy

---

## Open Design Questions

These don't block Phase 1 but should be answered before Phase 2:

1. **Relationship Events:** Should we emit webhooks when relationships are created/deleted?
2. **Audit Trail:** Do we need to track WHO created relationships (separate from record creation)?
3. **Relationship Types:** Should users be able to NAME relationships (e.g., "is_author_of" vs. just "many-to-one")?
4. **Cross-Collection Relations:** Should we eventually allow relationships between schemas in different collections?
5. **Circular Relations:** Are A→B→A cycles valid? Should we prevent them at schema validation time?
6. **Relationship Constraints:** Should users be able to add min/max cardinality (e.g., "Receta must have at least 2 ingredients")?

---

## Related Documents

- `RELATIONSHIPS_FEATURE.md` — Original design exploration and architectural options
- `openspec/changes/add-schema-relationships/` — Formal specs, design, tasks
- `db/schema.ts` — Current database schema (will include `relationships` table after Phase 1)
- `lib/server/repositories/relationship-repository.ts` — Future repository interface
