# Relationships Between Schemas - Feature Design

**Status:** Design Document (Not yet implemented)  
**Date:** 2026-09-10  
**Approach:** Hybrid (UI: Option A, DB Storage: Option B)

## Problem Statement

Currently, Jsonify allows users to create schemas with basic types (string, number, boolean, object, array). However, there's no way to create relationships between different schemas. This limits the application's usefulness for real-world use cases like:

- **Users** and **Recipes** (author relationship)
- **Recipes** and **Ingredients** (composition relationship)
- **Projects** and **Team Members** (assignment relationship)

The goal is to enable users to define and manage relationships between schemas directly in the UI, with proper validation and a clean data model.

## Options Explored

### Option A: New "relation" Type in JSON Schema (UI-Focused)

**Definition:** Add `"relation"` as a native type in the schema builder, similar to `string`, `number`, etc.

**Pros:**
- ✅ Clean and intuitive UI
- ✅ Schema fully describes data structure + relationships
- ✅ Easy form rendering (dropdowns, multi-selects)
- ✅ Validation is straightforward

**Cons:**
- ❌ `"relation"` is not a standard JSON Schema type
- ❌ More changes to schema-builder

**Example:**
```json
{
  "title": "Receta",
  "type": "object",
  "properties": {
    "titulo": { "type": "string" },
    "autor": {
      "type": "relation",
      "relationshipType": "many-to-one",
      "referencedSchema": "Usuario",
      "displayField": "nombre"
    }
  }
}
```

### Option B: JSON Schema Standard with `x-relation` Metadata (DB-Focused)

**Definition:** Use standard JSON Schema with `$ref` and custom `x-relation` extension.

**Pros:**
- ✅ Conforms to JSON Schema standard
- ✅ Compatible with external tools
- ✅ Uses UUID as the base type

**Cons:**
- ❌ More verbose
- ❌ Requires detecting `x-relation` in UI
- ❌ Less intuitive for builders

**Example:**
```json
{
  "title": "Receta",
  "type": "object",
  "properties": {
    "autor": {
      "type": "string",
      "format": "uuid",
      "$ref": "#/$defs/Usuario",
      "x-relation": {
        "schemaId": "schema-uuid",
        "relationshipType": "many-to-one",
        "displayField": "nombre"
      }
    }
  }
}
```

### Option C: Separate Relationship Configuration

**Definition:** Keep schemas pure (standard JSON Schema), define relationships as separate metadata.

**Pros:**
- ✅ Schemas remain completely standard
- ✅ Clean separation of concerns

**Cons:**
- ❌ Two places of configuration to maintain
- ❌ Risk of inconsistency
- ❌ More complex UI logic

## Chosen Approach: Hybrid (A + B)

**UI presents Option A** (intuitive type-based UI)  
**Storage uses Option B** (standard-compliant JSON Schema with metadata)

```
┌─────────────────────────────────────────┐
│    Schema Builder (UI) - Option A       │
│  Field type: [string|number|relation]   │
│  If "relation" → Select target schema   │
└─────────────────────────────────────────┘
              ↓ Converts to
┌─────────────────────────────────────────┐
│  JSON Schema (BD) - Option B             │
│  "type": "string",                      │
│  "format": "uuid",                      │
│  "x-relation": { ... }                  │
└─────────────────────────────────────────┘
```

**Benefits:**
- ✅ Intuitive for users
- ✅ Standards-compliant storage
- ✅ Retrocompatible with external tools
- ✅ Clear separation: UI concerns vs. data concerns

---

## Data Model

### Database Schema

**New table: `relationships`**

```sql
relationships {
  id: uuid (primary key)
  collectionId: uuid (foreign key → collections)
  sourceSchemaId: uuid (foreign key → schemas)
  targetSchemaId: uuid (foreign key → schemas)
  relationshipType: text ("one-to-one" | "one-to-many" | "many-to-one" | "many-to-many")
  sourceRecordId: uuid (foreign key → records)
  targetRecordId: uuid (foreign key → records)
  createdAt: timestamp
  updatedAt: timestamp
  
  Indexes:
  - ON sourceRecordId
  - ON targetRecordId
  - UNIQUE (sourceSchemaId, targetSchemaId, sourceRecordId, targetRecordId) for one-to-one
}
```

### Record Payload Example

**Scenario:** User creating a "Receta" (Recipe) record:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "schemaId": "schema-receta",
  "payload": {
    "titulo": "Pasta Carbonara",
    "descripcion": "Italian classic pasta",
    "autor": "user-record-uuid-123",
    "ingredientes": [
      "ingredient-record-uuid-456",
      "ingredient-record-uuid-789"
    ]
  }
}
```

The `autor` and `ingredientes` fields store **record UUIDs** of the related records.

### Schema Definition (Stored in DB)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Receta",
  "type": "object",
  "properties": {
    "titulo": { "type": "string" },
    "descripcion": { "type": "string" },
    "autor": {
      "type": "string",
      "format": "uuid",
      "x-relation": {
        "schemaId": "schema-usuario-uuid",
        "schemaName": "Usuario",
        "relationshipType": "many-to-one",
        "displayField": "nombre"
      }
    },
    "ingredientes": {
      "type": "array",
      "items": {
        "type": "string",
        "format": "uuid",
        "x-relation": {
          "schemaId": "schema-ingrediente-uuid",
          "schemaName": "Ingrediente",
          "relationshipType": "one-to-many",
          "displayField": "nombre"
        }
      }
    }
  },
  "required": ["titulo", "autor"]
}
```

---

## Required Changes

### 1. Schema Builder (`lib/schema-builder.ts`)

**Add new type:**
```typescript
export const JSON_SCHEMA_TYPES = [
  "string",
  "number",
  "integer",
  "boolean",
  "null",
  "object",
  "array",
  "relation", // ← NEW
] as const;
```

**Extend BuilderNode:**
```typescript
type BuilderNode = {
  id: string;
  name: string;
  type: JsonSchemaType;
  required: boolean;
  properties?: BuilderNode[];
  items?: BuilderNode;
  // NEW:
  relationConfig?: {
    referencedSchemaId: string;
    referencedSchemaName: string;
    displayField: string;
    relationshipType: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  };
};
```

**Add conversion function:**
```typescript
// Converts UI "relation" type to JSON Schema with x-relation
function toJsonSchema(node: BuilderNode): JsonSchema {
  if (node.type === "relation") {
    return {
      type: "string",
      format: "uuid",
      "x-relation": {
        schemaId: node.relationConfig.referencedSchemaId,
        schemaName: node.relationConfig.referencedSchemaName,
        relationshipType: node.relationConfig.relationshipType,
        displayField: node.relationConfig.displayField,
      },
    };
  }
  // ... existing logic
}
```

### 2. Database Layer (`db/schema.ts`)

Add new table:
```typescript
export const relationships = pgTable(
  "relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    sourceSchemaId: uuid("source_schema_id")
      .notNull()
      .references(() => schemas.id, { onDelete: "restrict" }),
    targetSchemaId: uuid("target_schema_id")
      .notNull()
      .references(() => schemas.id, { onDelete: "restrict" }),
    relationshipType: text("relationship_type").notNull(),
    sourceRecordId: uuid("source_record_id")
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    targetRecordId: uuid("target_record_id")
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    index("relationships_source_record_idx").on(table.sourceRecordId),
    index("relationships_target_record_idx").on(table.targetRecordId),
  ],
);
```

### 3. Repository Types (`lib/server/repositories/types.ts`)

**Add types:**
```typescript
export type Relationship = {
  id: string;
  collectionId: string;
  sourceSchemaId: string;
  targetSchemaId: string;
  relationshipType: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  sourceRecordId: string;
  targetRecordId: string;
  createdAt: string;
  updatedAt: string;
};

export type NewRelationship = {
  collectionId: string;
  sourceSchemaId: string;
  targetSchemaId: string;
  relationshipType: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  sourceRecordId: string;
  targetRecordId: string;
};

export class DuplicateRelationshipError extends DomainError {
  constructor(message = "This relationship already exists.") {
    super(message);
  }
}

export class InvalidRelationshipError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
```

### 4. New Relationship Repository

**Interface:** `lib/server/repositories/relationship-repository.ts`

```typescript
export interface RelationshipRepository {
  create(input: NewRelationship): Promise<Relationship>;
  findById(id: string): Promise<Relationship | null>;
  listBySourceRecord(sourceRecordId: string): Promise<Relationship[]>;
  listByTargetRecord(targetRecordId: string): Promise<Relationship[]>;
  findRelationship(
    sourceRecordId: string,
    targetRecordId: string,
  ): Promise<Relationship | null>;
  delete(id: string): Promise<boolean>;
  deleteByRecordId(recordId: string): Promise<number>;
}
```

**Implementation:** `lib/server/repositories/drizzle/relationship-repository.ts`

### 5. Payload Validation (`lib/server/validate-payload.ts`)

**Enhanced validation:**
```typescript
// When field.type is "relation" (or x-relation in JSON):
if (hasRelationConfig(field)) {
  const relatedRecord = await recordRepository.findById(value);
  
  if (!relatedRecord) {
    throw new ValidationError(
      `Invalid relation: record "${value}" does not exist`
    );
  }
  
  if (relatedRecord.schemaId !== field.relationConfig.referencedSchemaId) {
    throw new ValidationError(
      `Invalid relation: record must be of type "${field.relationConfig.referencedSchemaName}"`
    );
  }
  
  // Create relationship entry
  await relationshipRepository.create({
    sourceRecordId: newRecord.id,
    targetRecordId: value,
    sourceSchemaId: newRecord.schemaId,
    targetSchemaId: field.relationConfig.referencedSchemaId,
    relationshipType: field.relationConfig.relationshipType,
    collectionId: newRecord.collectionId,
  });
}
```

### 6. Form UI (`app/components/form-filler/`)

**Detect relation fields:**
```typescript
// In form rendering logic:
if (field["x-relation"]) {
  // Render as dropdown (single) or multi-select (array)
  // Load records from target schema
  const targetRecords = await recordRepository.listBySchema(
    field["x-relation"].schemaId
  );
  
  // Display using displayField
  return <RecordSelector
    records={targetRecords}
    displayField={field["x-relation"].displayField}
    isMultiple={fieldSchema.type === "array"}
  />;
}
```

### 7. Schema Builder UI (`app/schema-builder.tsx`)

**When creating fields:**
```typescript
// Add UI to select "relation" type
if (selectedType === "relation") {
  // Show:
  // 1. Dropdown to select target schema
  // 2. Dropdown to select which field to display (displayField)
  // 3. Selector for relationshipType
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Core functionality)
1. Add `relationships` table to DB
2. Create `RelationshipRepository` interface + Drizzle implementation
3. Extend `JSON_SCHEMA_TYPES` and `BuilderNode`
4. Add conversion function (`toJsonSchema` with relation handling)
5. Update payload validation

### Phase 2: User Interface
6. Schema builder: Add "relation" type selector
7. Schema builder: Add relation configuration panel
8. Form filler: Detect and render relation fields as dropdowns
9. Form filler: Add record selector component

### Phase 3: Advanced
10. Query records with related data (JOINs)
11. Cascade delete handling
12. API support for querying via relationships
13. UI for browsing/managing relationships

---

## Example Workflow

### Step 1: Create Schemas

**Schema 1: Usuario**
```
Fields:
  - nombre (string)
  - email (string)
```

**Schema 2: Receta**
```
Fields:
  - titulo (string)
  - descripcion (string)
  - autor (relation → Usuario, displayField: "nombre")
  - ingredientes (array of relations → Ingrediente, displayField: "nombre")
```

**Schema 3: Ingrediente**
```
Fields:
  - nombre (string)
  - cantidad (string)
```

### Step 2: Create Records

**Usuario record:**
```json
{
  "id": "user-123",
  "nombre": "Luis",
  "email": "luis@example.com"
}
```

**Ingrediente records:**
```json
[
  { "id": "ing-1", "nombre": "Pasta", "cantidad": "500g" },
  { "id": "ing-2", "nombre": "Eggs", "cantidad": "4" },
  { "id": "ing-3", "nombre": "Bacon", "cantidad": "200g" }
]
```

### Step 3: Create Receta Record (with relationships)

**User fills form:**
- `titulo`: "Pasta Carbonara"
- `descripcion`: "Italian classic"
- `autor`: Selects "Luis" (dropdown showing displayField "nombre")
- `ingredientes`: Multi-select "Pasta", "Eggs", "Bacon"

**Result in DB:**

Record payload:
```json
{
  "titulo": "Pasta Carbonara",
  "descripcion": "Italian classic",
  "autor": "user-123",
  "ingredientes": ["ing-1", "ing-2", "ing-3"]
}
```

Relationship entries created:
```
relationship-1: sourceRecordId=receta-123, targetRecordId=user-123, type=many-to-one
relationship-2: sourceRecordId=receta-123, targetRecordId=ing-1, type=one-to-many
relationship-3: sourceRecordId=receta-123, targetRecordId=ing-2, type=one-to-many
relationship-4: sourceRecordId=receta-123, targetRecordId=ing-3, type=one-to-many
```

---

## Validation Rules

### Schema-Level Validation
- Cannot create relation to schema in different collection (initially)
- Cannot create self-referencing relation (initially)
- `displayField` must exist in target schema
- `relationshipType` must be valid

### Record-Level Validation
- Target record must exist
- Target record must belong to referenced schema
- Relationship must not already exist (for one-to-one)
- Cascade delete: deleting a record removes its relationship entries

---

## Future Considerations

- **Polymorphic relations**: Reference any schema, not just one
- **Constraints**: Min/max counts for one-to-many relationships
- **Computed fields**: Fields that aggregate related data
- **Query API**: Filter records by related data
- **Relationship events**: Webhooks when relations are created/deleted
- **Soft deletes**: Keep relationships even if records are soft-deleted

---

## References

- [JSON Schema Standard](https://json-schema.org/)
- [JSON Schema Extensions](https://json-schema.org/understanding-json-schema/basics/comments.html)
- Current DB Schema: `db/schema.ts`
- Current Validation: `lib/server/validate-payload.ts`
