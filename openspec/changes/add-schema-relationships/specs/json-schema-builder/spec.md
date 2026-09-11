## MODIFIED Requirements

### Requirement: Define typed properties

The system SHALL allow a user to add, rename, change the type of, and remove properties at any editable object level. The available property types SHALL include string, number, integer, boolean, null, object, array, and **relation**.

#### Scenario: Add a scalar property

- **WHEN** the user adds a property named `age` with type number
- **THEN** the generated schema includes `age` under the current object's `properties` with `type` set to `number`

#### Scenario: Change a property type

- **WHEN** the user changes an existing property's type
- **THEN** the generated schema reflects the selected type and removes configuration that is incompatible with that type

#### Scenario: Remove a property

- **WHEN** the user removes a property
- **THEN** that property no longer appears in the builder or the generated schema

#### Scenario: Add a relation property
- **WHEN** the user adds a property with type "relation"
- **THEN** the builder displays additional controls to configure the relationship:
  - Target schema selector (dropdown of all schemas in the collection)
  - Display field selector (dropdown of string fields from the target schema)
  - Relationship type selector (one-to-one, one-to-many, many-to-one, many-to-many)

#### Scenario: Configure relation target schema

- **WHEN** user selects type "relation" for a property named `author`
- **AND** clicks to configure the relation
- **THEN** a dropdown is shown with all available schemas in the collection
- **AND** user can select one as the target schema

#### Scenario: Configure relation display field

- **WHEN** user has selected a target schema for a relation property
- **THEN** a dropdown is shown with all string fields from that target schema
- **AND** user can select one field to use as the display label

#### Scenario: Configure relation cardinality

- **WHEN** user is configuring a relation property
- **THEN** options are shown for relationship type: "one-to-one", "one-to-many", "many-to-one", "many-to-many"
- **AND** user can select one based on their data model

#### Scenario: Relation metadata is persisted in schema

- **WHEN** user saves a schema with a relation property
- **THEN** the JSON schema includes `x-relation` metadata for that property with:
  - `schemaId`: UUID of the target schema
  - `schemaName`: name of the target schema
  - `displayField`: selected display field
  - `relationshipType`: selected cardinality type

#### Scenario: Change relation configuration

- **WHEN** user modifies an existing relation property (changes target schema, display field, or cardinality)
- **THEN** the schema is updated with the new `x-relation` metadata
- **AND** previous configuration is replaced (not merged)

## ADDED Requirements

### Requirement: Support array of relations

When a relation field is configured as an array type, the user SHALL be able to specify multiple related records.

#### Scenario: Array of relations for many-to-many

- **WHEN** user creates a relation property with relationship type "many-to-many" or "one-to-many"
- **THEN** the property is automatically stored as an array of string UUIDs in the schema
- **AND** the `x-relation` metadata indicates the cardinality type

#### Scenario: Array of relations is rendered correctly

- **WHEN** a schema has an array relation property (e.g., `ingredientes` in Receta)
- **THEN** the generated JSON schema represents it as:
  ```json
  {
    "type": "array",
    "items": {
      "type": "string",
      "format": "uuid",
      "x-relation": { ... }
    }
  }
  ```
