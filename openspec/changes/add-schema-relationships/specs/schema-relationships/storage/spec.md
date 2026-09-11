## Purpose

Provides a persistent, queryable storage layer for relationships between records, enabling efficient relationship queries and cascade operations.

## ADDED Requirements

### Requirement: Store relationship connections in dedicated table

The system SHALL maintain a `relationships` table that records each connection between source and target records.

#### Scenario: Relationship is persisted
- **WHEN** a record with a valid relation is created
- **THEN** a row is inserted into the `relationships` table with:
  - `id`: UUID primary key
  - `sourceRecordId`: UUID of the record containing the relation
  - `targetRecordId`: UUID of the referenced record
  - `sourceSchemaId`: UUID of the source schema
  - `targetSchemaId`: UUID of the target schema
  - `collectionId`: UUID of the collection (for multi-tenancy)
  - `createdAt`, `updatedAt`: timestamps
- **NOTE:** Cardinality (one-to-one, many-to-one, etc.) is a schema property, not stored per-relationship. It can be determined by querying the source schema's `x-relation` metadata

### Requirement: Index relationships for efficient queries

The system SHALL maintain indexes on relationship records to enable fast queries.

#### Scenario: Queries by source record are efficient
- **WHEN** the system queries all relationships where `sourceRecordId = X`
- **THEN** an index on `sourceRecordId` enables efficient retrieval

#### Scenario: Queries by target record are efficient
- **WHEN** the system queries all relationships where `targetRecordId = Y`
- **THEN** an index on `targetRecordId` enables efficient retrieval

### Requirement: Support cascade delete of relationships

When a record is deleted, all relationship entries where that record is source or target SHALL be deleted.

#### Scenario: Deleting a source record removes its relationships
- **WHEN** a "Receta" record is deleted
- **THEN** all relationship entries where `sourceRecordId` = that record's ID are deleted
- **AND** the "Receta" record itself is deleted

#### Scenario: Deleting a target record removes its relationships
- **WHEN** a "Usuario" record is deleted
- **AND** other "Receta" records reference it via "autor" relation
- **THEN** all relationship entries where `targetRecordId` = that record's ID are deleted
- **AND** the "Usuario" record itself is deleted

### Requirement: Track relationship creation and updates

Each relationship entry SHALL record when it was created and last updated.

#### Scenario: Timestamps are recorded
- **WHEN** a relationship is created
- **THEN** `createdAt` is set to the current timestamp
- **AND** `updatedAt` is set to the current timestamp

#### Scenario: Update timestamp is refreshed
- **WHEN** a relationship is updated
- **THEN** `updatedAt` is refreshed to current timestamp
- **AND** `createdAt` remains unchanged

### Requirement: Enforce one-to-one uniqueness (bidirectional)

For one-to-one relationships, the system SHALL prevent:
1. A source record from having multiple targets
2. Multiple source records from pointing to the same target

#### Scenario: Source cannot have multiple one-to-one targets
- **WHEN** a record already has a one-to-one relation to target record X
- **AND** an attempt is made to create another one-to-one relation from the same source record to target record Y
- **THEN** the system rejects the operation with error "Source record already has a one-to-one relationship"

#### Scenario: Target cannot be referenced by multiple one-to-one sources
- **WHEN** a record Y is already referenced by source record A in a one-to-one relationship
- **AND** an attempt is made to create another one-to-one relationship from different source record B to target Y
- **THEN** the system rejects the operation with error "Target record is already referenced by another one-to-one relationship"

#### Scenario: Many-to-one allows multiple sources to same target
- **WHEN** creating many-to-one relationships (e.g., multiple Recetas pointing to same Usuario author)
- **THEN** the system allows multiple source records to reference the same target record without restriction
