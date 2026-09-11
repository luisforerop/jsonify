## Why

Jsonify currently supports creating schemas with basic types (string, number, boolean, object, array), but lacks the ability to define relationships between different schemas. This limits the platform's utility for real-world data modeling where data is inherently relational (e.g., Users with Recipes, Recipes with Ingredients, Projects with Team Members). Adding relationship support will unlock multi-entity applications and make Jsonify a complete solution for building SaaS applications without needing a separate database schema design.

## What Changes

- **New type in schema builder**: Add `"relation"` as a native field type, allowing users to define references to other schemas
- **Relationship configuration UI**: Schema builder gains controls to select target schema, choose display field, and define relationship type (one-to-one, one-to-many, many-to-one, many-to-many)
- **Database layer**: New `relationships` table to track all relationship connections between records
- **Form rendering**: Form filler detects relation fields and renders them as dropdowns or multi-select components
- **Payload validation**: Extended validation to ensure referenced records exist and belong to the correct schema
- **Relationship metadata**: Relations stored in JSON Schema using standard `x-relation` extension, maintaining compatibility with external tools

## Capabilities

### New Capabilities

- `schema-relationships/definition`: Users can define new relation fields in schemas with target schema and display field configuration
- `schema-relationships/validation`: Backend validates that related records exist and match the target schema before persisting
- `schema-relationships/form-rendering`: Form filler auto-renders relation fields as dropdowns (single relation) or multi-select (array of relations)
- `schema-relationships/storage`: Relationship connections are stored in a dedicated `relationships` table for efficient querying and cascade operations
- `schema-relationships/json-schema-compliance`: Relations are stored in JSON Schema standard format using `x-relation` metadata extension

### Modified Capabilities

- `schema-builder`: Schema builder now supports "relation" as a JSON Schema type with configuration for target schema and display field

## Impact

**Affected Code:**
- `lib/schema-builder.ts`: Add "relation" type to `JSON_SCHEMA_TYPES` and extend `BuilderNode`
- `db/schema.ts`: Add new `relationships` table with appropriate indexes
- `lib/server/repositories/`: New `RelationshipRepository` interface + Drizzle implementation
- `lib/server/repositories/types.ts`: New types for `Relationship`, `NewRelationship`, error classes
- `lib/server/validate-payload.ts`: Extended validation for relation fields
- `app/schema-builder.tsx`: UI controls for configuring relation fields
- `app/components/form-filler/`: Components for rendering relation fields as dropdowns/selectors

**APIs:**
- No breaking changes to existing APIs; new relationship endpoints/queries will be added

**Dependencies:**
- No new external dependencies required

**Database:**
- Migration: Add `relationships` table with foreign keys and indexes
