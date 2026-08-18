## Purpose

Provide a form-based workspace for creating valid, nested JSON Schemas and retaining saved schemas in the user's browser.

## ADDED Requirements

### Requirement: Start a named schema

The system SHALL allow a user to enter a name before defining the properties of a new JSON Schema. The generated schema SHALL use that name as its title.

#### Scenario: Start a schema with a name

- **WHEN** the user enters a schema name
- **THEN** the builder displays a root schema ready to receive properties using that name as its title

### Requirement: Define typed properties

The system SHALL allow a user to add, rename, change the type of, and remove properties at any editable object level. The available property types SHALL include string, number, integer, boolean, null, object, and array.

#### Scenario: Add a scalar property

- **WHEN** the user adds a property named `age` with type number
- **THEN** the generated schema includes `age` under the current object's `properties` with `type` set to `number`

#### Scenario: Change a property type

- **WHEN** the user changes an existing property's type
- **THEN** the generated schema reflects the selected type and removes configuration that is incompatible with that type

#### Scenario: Remove a property

- **WHEN** the user removes a property
- **THEN** that property no longer appears in the builder or the generated schema

### Requirement: Model nested structures

The system SHALL allow object properties to contain their own typed properties at arbitrary nesting levels. The system SHALL allow an array property to define an item type and SHALL allow object array items to contain nested properties.

#### Scenario: Add nested object properties

- **WHEN** the user adds an object property and then adds a property inside it
- **THEN** the generated schema represents the outer property as an object with the inner property in its `properties`

#### Scenario: Configure object array items

- **WHEN** the user selects object as an array's item type and adds an item property
- **THEN** the generated schema represents the array item definition as an object containing that property

### Requirement: Manage schemas through a persistence boundary

The system SHALL expose create, read, update, and delete operations for saved JSON Schemas through external client-side hooks. The schema-builder interface SHALL use those hooks rather than accessing browser localStorage directly. The initial hook implementation SHALL persist schemas in browser localStorage, and a saved schema SHALL remain available after the browser page is reloaded in the same browser profile.

#### Scenario: Save a valid schema

- **WHEN** the user selects save for a named schema
- **THEN** the interface creates the generated JSON Schema through the persistence hook and the user receives confirmation that it was saved

#### Scenario: Update a saved schema

- **WHEN** the user saves changes to an existing schema
- **THEN** the interface updates that schema through the persistence hook without creating a duplicate saved entry

#### Scenario: Load saved schemas

- **WHEN** the schema-builder view becomes available
- **THEN** it obtains the saved schema collection through the persistence hook

#### Scenario: Delete a saved schema

- **WHEN** the user deletes a saved schema
- **THEN** the interface removes that schema through the persistence hook and it no longer appears in the saved collection

#### Scenario: Reload after saving

- **WHEN** the user reloads the application after saving a schema
- **THEN** the saved JSON Schema remains available through the persistence hook
