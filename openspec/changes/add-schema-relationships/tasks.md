## 1. Database & Repository Foundation

- [ ] 1.1 Create database migration to add `relationships` table with columns: `id`, `sourceRecordId`, `targetRecordId`, `sourceSchemaId`, `targetSchemaId`, `collectionId`, `createdAt`, `updatedAt` (NO `relationshipType`)
- [ ] 1.2 Add indexes: `ON sourceRecordId`, `ON targetRecordId`, `ON (sourceSchemaId, targetSchemaId)`
- [ ] 1.3 Add `relationships` type definitions to `lib/server/repositories/types.ts` (remove `relationshipType` field)
- [ ] 1.4 Create `RelationshipRepository` interface in `lib/server/repositories/relationship-repository.ts`
- [ ] 1.5 Implement Drizzle repository at `lib/server/repositories/drizzle/relationship-repository.ts` with bidirectional one-to-one validation
- [ ] 1.6 Register repository in `lib/server/repositories/registry.ts`

## 2. Schema Builder Core (Backend)

- [ ] 2.1 Add `"relation"` to `JSON_SCHEMA_TYPES` in `lib/schema-builder.ts`
- [ ] 2.2 Extend `BuilderNode` type with `relationConfig` field in `lib/schema-builder.ts`
- [ ] 2.3 Add `changeNodeType()` handler for "relation" type in `lib/schema-builder.ts`
- [ ] 2.4 Create `toJsonSchema()` conversion that transforms "relation" type to JSON Schema with `x-relation` metadata
- [ ] 2.5 Add `propertiesFromJsonSchema()` logic to parse `x-relation` metadata back to BuilderNode

## 3. Payload Validation & Relationship Creation

- [ ] 3.1 Add `hasRelationConfig()` and `extractRelationConfig()` helper functions to detect `x-relation` in fields
- [ ] 3.2 Extend `validate-payload.ts` to validate single relation fields (check record exists + schema match)
- [ ] 3.3 Extend `validate-payload.ts` to validate array relation fields (iterate all UUIDs, check each)
- [ ] 3.4 Implement transactional wrapper for record creation + all relationship entries (atomicity)
- [ ] 3.5 Add one-to-one bidirectional validation: reject if source already has 1:1 target, OR if target already referenced by another 1:1 source
- [ ] 3.6 Add cascade delete handling: when a record is deleted, remove its relationship entries (via FK or explicit delete)
- [ ] 3.7 Add lazy cleanup for stale references: when rendering form/API, skip displaying broken relations (null/404)
- [ ] 3.8 Add error classes: `InvalidRelationshipError`, `DuplicateRelationshipError` to types.ts
- [ ] 3.9 Write validation tests for relation fields (valid, missing, wrong schema, array relations, 1:1 uniqueness)

## 4. Schema Builder UI (Frontend)

- [ ] 4.1 Create relation field configuration panel component in `app/components/schema-builder/`
- [ ] 4.2 Add "relation" option to type selector dropdown in schema builder
- [ ] 4.3 Implement target schema selector (dropdown of all schemas in collection)
- [ ] 4.4 Implement display field selector (dropdown of string fields from target schema)
- [ ] 4.5 Implement relationship cardinality selector (one-to-one, one-to-many, many-to-one, many-to-many)
- [ ] 4.6 Add UI to show/edit relation configuration when field is selected
- [ ] 4.7 Wire relation configuration into schema save flow (ensure `x-relation` is included in saved JSON)
- [ ] 4.8 Test import/export: verify schemas with relations can be imported and re-edited

## 5. Form Rendering (Frontend)

- [ ] 5.1 Create `useTargetRecords()` hook to load records from target schema with LIMIT 50
- [ ] 5.2 Add affordance to show "Showing 50 of X records" when count exceeds limit
- [ ] 5.3 Implement client-side filter for dropdown when user starts typing (Phase 1 solution)
- [ ] 5.4 Create single-relation dropdown selector component with lazy cleanup (skip broken references)
- [ ] 5.5 Create multi-select component for array relations
- [ ] 5.6 Add record display logic (show `displayField` value instead of UUID, handle null gracefully)
- [ ] 5.7 Wire relation detection into form filler to use new selectors for `x-relation` fields
- [ ] 5.8 Add "Clear" functionality to remove relations from records
- [ ] 5.9 Test form rendering with various relation configurations (single, array, > 50 records, stale refs)

## 6. Integration & Testing

- [ ] 6.1 End-to-end test: create schema with relation, create records with relations, verify relationship table entries
- [ ] 6.2 End-to-end test: update record to change relation, verify relationship entries updated
- [ ] 6.3 End-to-end test: delete source record, verify cascade delete of relationships
- [ ] 6.4 End-to-end test: delete target record, verify cascading cleanup
- [ ] 6.5 Test transactionality: create record with array relations, simulate partial failure, verify rollback
- [ ] 6.6 Test one-to-one bidirectional uniqueness: attempt duplicate 1:1 on both source and target side
- [ ] 6.7 Test lazy cleanup: delete target record, verify form/API gracefully skips stale reference
- [ ] 6.8 Test validation: attempt to create record with invalid relation, verify error handling
- [ ] 6.9 Test form rendering: verify dropdowns populate with max 50 records
- [ ] 6.10 Test form rendering: verify "Showing X of Y" message when record count > 50
- [ ] 6.11 Test array relations: verify multi-select allows multiple selections and validates all
- [ ] 6.12 Documentation: update README or docs with relationship feature overview

## 7. Edge Cases & Polish

- [ ] 7.1 Handle one-to-one duplicate prevention (unique constraint validation)
- [ ] 7.2 Test self-referencing relations (if allowed)
- [ ] 7.3 Test relation field required/optional (mark field as required in schema)
- [ ] 7.4 Test circular reference handling (A → B → A)
- [ ] 7.5 Performance testing: form with many relation fields, dropdowns with large record sets
- [ ] 7.6 Error messages: ensure user-facing errors for all validation failures are clear
- [ ] 7.7 UI polish: ensure relation configuration UI is intuitive and matches design system
