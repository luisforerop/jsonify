## MODIFIED Requirements

### Requirement: Manage schemas through a persistence boundary

The system SHALL expose create, read, update, and delete operations for saved
JSON Schemas, scoped to the active collection within the active workspace,
through external client-side hooks. The schema-builder interface SHALL use those
hooks rather than accessing browser localStorage directly. The hook
implementation SHALL persist schemas in a project-local JSON file through the
server, and its create, read, update, and delete operations SHALL be
asynchronous. A saved schema SHALL remain available after the browser page is
reloaded, including from a different browser or machine using the same server,
still associated with its collection and workspace.

#### Scenario: Save a valid schema

- **WHEN** the user selects save for a named schema within an active collection
- **THEN** the interface creates the generated JSON Schema through the persistence hook, associated with that collection and its workspace, and the user receives confirmation that it was saved

#### Scenario: Update a saved schema

- **WHEN** the user saves changes to an existing schema
- **THEN** the interface updates that schema through the persistence hook without creating a duplicate saved entry

#### Scenario: Load saved schemas

- **WHEN** the schema-builder view becomes available for an active collection
- **THEN** it obtains that collection's saved schemas through the persistence hook

#### Scenario: Delete a saved schema

- **WHEN** the user deletes a saved schema
- **THEN** the interface removes that schema through the persistence hook and it no longer appears in the saved collection

#### Scenario: Reload after saving

- **WHEN** the user reloads the application after saving a schema
- **THEN** the saved JSON Schema remains available through the persistence hook, still associated with its collection

#### Scenario: Schemas are isolated per project

- **WHEN** two different collections each have saved schemas
- **THEN** the schema-builder opened for one collection does not display the other collection's schemas
