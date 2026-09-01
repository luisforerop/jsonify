## MODIFIED Requirements

### Requirement: Manage schemas through a persistence boundary

The system SHALL expose create, read, update, and delete operations for saved JSON Schemas, scoped to the active project, through external client-side hooks. The schema-builder interface SHALL use those hooks rather than accessing browser localStorage directly. The initial hook implementation SHALL persist schemas in browser localStorage, and a saved schema SHALL remain available after the browser page is reloaded in the same browser profile.

#### Scenario: Save a valid schema

- **WHEN** the user selects save for a named schema within an active project
- **THEN** the interface creates the generated JSON Schema through the persistence hook, associated with that project, and the user receives confirmation that it was saved

#### Scenario: Update a saved schema

- **WHEN** the user saves changes to an existing schema
- **THEN** the interface updates that schema through the persistence hook without creating a duplicate saved entry

#### Scenario: Load saved schemas

- **WHEN** the schema-builder view becomes available for an active project
- **THEN** it obtains that project's saved schema collection through the persistence hook

#### Scenario: Delete a saved schema

- **WHEN** the user deletes a saved schema
- **THEN** the interface removes that schema through the persistence hook and it no longer appears in the saved collection

#### Scenario: Reload after saving

- **WHEN** the user reloads the application after saving a schema
- **THEN** the saved JSON Schema remains available through the persistence hook, still associated with its project

#### Scenario: Schemas are isolated per project

- **WHEN** two different projects each have saved schemas
- **THEN** the schema-builder opened for one project does not display the other project's schemas
