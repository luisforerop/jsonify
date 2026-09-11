## Purpose

Allows users to define relationships between schemas by specifying which schema a field references, enabling multi-entity data models.

## ADDED Requirements

### Requirement: Add relation type to schema builder

The schema builder SHALL support `"relation"` as a native field type alongside existing types (string, number, boolean, object, array).

#### Scenario: User selects relation type
- **WHEN** user creates a new field and selects type "relation"
- **THEN** UI displays additional controls to configure the relationship

### Requirement: Configure target schema

When a field is set to type "relation", users SHALL be able to select which schema the field references.

#### Scenario: User selects target schema
- **WHEN** user has a relation field and clicks "Select target schema"
- **THEN** system displays a dropdown list of all schemas in the collection
- **AND** user can select one schema as the target

### Requirement: Configure display field

Users SHALL specify which field from the target schema to display when rendering the relationship in UI.

#### Scenario: User selects display field
- **WHEN** user configures a relation field to target a schema
- **THEN** system displays a dropdown of all string fields from the target schema
- **AND** user can select one field to use as the display label

### Requirement: Define relationship type

Users SHALL specify the cardinality of the relationship (one-to-one, one-to-many, many-to-one, many-to-many).

#### Scenario: User specifies relationship cardinality
- **WHEN** user configures a relation field
- **THEN** system displays options: "one-to-one", "one-to-many", "many-to-one", "many-to-many"
- **AND** user can select one option based on their use case

### Requirement: Schema stores relation metadata

The relation configuration (target schema, display field, relationship type) SHALL be persisted in the schema definition using JSON Schema `x-relation` extension.

#### Scenario: Relation configuration is saved
- **WHEN** user saves a schema with a relation field
- **THEN** the JSON schema definition includes `"x-relation"` metadata with:
  - `schemaId`: UUID of the target schema
  - `schemaName`: name of the target schema
  - `displayField`: field name to display
  - `relationshipType`: cardinality type
