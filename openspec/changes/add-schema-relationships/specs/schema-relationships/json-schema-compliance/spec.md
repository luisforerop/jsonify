## Purpose

Ensures relationship definitions are stored in a JSON Schema-compliant format using standard extensions, enabling compatibility with external tools and future portability.

## ADDED Requirements

### Requirement: Store relations as JSON Schema with x-relation extension

Relation fields SHALL be stored in the schema definition using standard JSON Schema with a custom `x-relation` extension for metadata.

#### Scenario: Relation field has correct JSON structure
- **WHEN** a schema is saved with a relation field
- **THEN** the field in the JSON schema definition has:
  - `type`: "string" (base type for single relation) or `type: "array"` with `items: { type: "string" }` (for many relations)
  - `format`: "uuid" (indicates the string contains a UUID)
  - `x-relation`: object containing relation metadata

### Requirement: x-relation metadata structure

The `x-relation` extension SHALL include all necessary metadata for relationship resolution and UI rendering.

#### Scenario: Single relation metadata is complete
- **WHEN** a single relation field is stored
- **THEN** the `x-relation` object contains:
  - `schemaId`: UUID of the target schema
  - `schemaName`: name of the target schema (for display/debugging)
  - `relationshipType`: one of "one-to-one", "one-to-many", "many-to-one", "many-to-many"
  - `displayField`: name of the field to display from target records

#### Scenario: Array relation metadata is complete
- **WHEN** an array relation field is stored
- **THEN** the `x-relation` object contains the same metadata as single relations
- **AND** the system correctly interprets the array wrapper

### Requirement: Maintain JSON Schema standard compliance

The stored schema definition SHALL conform to JSON Schema Draft 2020-12 standard with `x-relation` as an extension.

#### Scenario: Schema validates against JSON Schema standard
- **WHEN** the schema definition is validated against JSON Schema Draft 2020-12
- **THEN** the definition is valid (ignoring unknown `x-relation` properties is standard behavior)
- **AND** non-schema-aware tools can still parse the structure

### Requirement: Support schema export and import

Users SHALL be able to export schemas with relations and re-import them, preserving relationship definitions.

#### Scenario: Relation schema can be exported
- **WHEN** user exports a schema containing relation fields
- **THEN** the exported JSON includes the complete `x-relation` metadata
- **AND** the structure is valid JSON

#### Scenario: Exported relation schema can be imported
- **WHEN** user imports a schema that includes `x-relation` metadata
- **THEN** the system parses and stores the relation definitions
- **AND** the relationships are fully functional in the imported schema

### Requirement: Graceful handling of x-relation in external tools

Schemas with relations SHALL be compatible with external JSON Schema validators and documentation tools.

#### Scenario: External tool processes schema with x-relation
- **WHEN** an external tool reads a Jsonify schema with relation fields
- **THEN** the tool can parse the schema structure without errors
- **AND** the custom `x-relation` extension is preserved as-is (unknown properties are allowed in JSON Schema)
