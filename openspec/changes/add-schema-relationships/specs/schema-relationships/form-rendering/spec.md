## Purpose

Provides intuitive form controls for users to select and manage relationships when filling out records, automatically adapting UI based on relationship cardinality.

## ADDED Requirements

### Requirement: Detect relation fields in form

The form filler SHALL detect fields with `x-relation` metadata and render them as relationship selectors instead of text inputs.

#### Scenario: Relation field is detected
- **WHEN** form is rendered for a schema containing a field with `x-relation` metadata
- **THEN** the field is identified as a relation field
- **AND** special relationship rendering logic is triggered

### Requirement: Render single relation as dropdown

When a relation field is not an array (single relation), the form SHALL render it as a dropdown selector.

#### Scenario: Single relation field shows dropdown
- **WHEN** form renders a single relation field (e.g., "autor" in Receta schema)
- **THEN** a dropdown/select component is displayed
- **AND** the dropdown is populated with available records from the target schema
- **AND** records are displayed using the configured `displayField` value

#### Scenario: Dropdown loads all target records
- **WHEN** user opens the dropdown for a single relation field
- **THEN** the system loads all records from the target schema
- **AND** displays them in the dropdown using the configured displayField (e.g., "nombre" for Usuario)

### Requirement: Render multiple relations as multi-select

When a relation field is an array type (many relations), the form SHALL render it as a multi-select component.

#### Scenario: Array relation field shows multi-select
- **WHEN** form renders an array relation field (e.g., "ingredientes" in Receta schema)
- **THEN** a multi-select component is displayed
- **AND** users can select multiple records from the target schema

#### Scenario: User adds multiple relations
- **WHEN** user selects multiple records in a multi-select relation field
- **THEN** each selected record is added to the field's value array
- **AND** selected records are displayed as tags or items that can be individually removed

### Requirement: Display relation values from loaded records

When displaying an existing record, relation fields SHALL show the display field value of related records, not UUIDs.

#### Scenario: Relation is displayed with readable label
- **WHEN** an existing Receta record is loaded for editing
- **AND** it has a "autor" relation field with UUID `user-123`
- **THEN** the form displays the related Usuario's "nombre" value (e.g., "Luis") instead of `user-123`

### Requirement: Allow clearing relation fields

Users SHALL be able to clear a relation field, removing the relationship.

#### Scenario: User clears a single relation
- **WHEN** user clicks "Clear" or removes selection from a single relation field
- **THEN** the field value is set to null or empty
- **AND** on save, the corresponding relationship entry is marked for deletion

#### Scenario: User removes item from multi-select
- **WHEN** user removes an item from a multi-select relation field
- **THEN** that item is removed from the array
- **AND** the corresponding relationship entry is marked for deletion on save
