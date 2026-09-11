## Purpose

Ensures that relationship values in records point to valid, existing records of the correct target schema, maintaining referential integrity.

## ADDED Requirements

### Requirement: Validate relation field exists in target schema

When creating or updating a record with a relation field, the system SHALL verify that the specified target record exists.

#### Scenario: Valid relation is accepted
- **WHEN** user creates a record with a relation field pointing to UUID `abc-123`
- **AND** a record with that UUID exists in the target schema
- **THEN** the record is created successfully

#### Scenario: Missing relation is rejected
- **WHEN** user creates a record with a relation field pointing to UUID `missing-id`
- **AND** no record with that UUID exists
- **THEN** the system rejects the record with error: "Invalid relation: record does not exist"

### Requirement: Validate relation record belongs to target schema

The system SHALL verify that the related record belongs to the specified target schema before accepting it.

#### Scenario: Relation to wrong schema is rejected
- **WHEN** user creates a record with a relation field configured to reference "Usuario" schema
- **AND** the specified record UUID exists but belongs to "Ingrediente" schema
- **THEN** the system rejects the record with error: "Invalid relation: record must be of type Usuario"

#### Scenario: Relation to correct schema is accepted
- **WHEN** user creates a record with a relation field configured to reference "Usuario" schema
- **AND** the specified record UUID belongs to "Usuario" schema
- **THEN** the record is created successfully

### Requirement: Create relationship entry on successful validation

When a record with a valid relation is created, the system SHALL create an entry in the relationships table tracking this connection.

#### Scenario: Relationship is recorded
- **WHEN** user creates a "Receta" record with valid "autor" relation to a "Usuario" record
- **THEN** a relationship entry is created with:
  - `sourceRecordId`: ID of the new Receta record
  - `targetRecordId`: ID of the referenced Usuario record
  - `sourceSchemaId`: ID of Receta schema
  - `targetSchemaId`: ID of Usuario schema
  - `relationshipType`: "many-to-one" (as configured in schema)

### Requirement: Support array of relations

When a relation field is an array type, the system SHALL validate each item in the array as a valid relation.

#### Scenario: Multiple relations are each validated
- **WHEN** user creates a record with a relation array field containing `["record-1", "record-2", "record-3"]`
- **AND** all three records exist and belong to the target schema
- **THEN** the record is created successfully with relationship entries created for each relation

#### Scenario: One invalid relation in array is rejected
- **WHEN** user creates a record with a relation array field containing `["valid-id", "invalid-id"]`
- **THEN** the system rejects the record with error indicating which UUID is invalid
