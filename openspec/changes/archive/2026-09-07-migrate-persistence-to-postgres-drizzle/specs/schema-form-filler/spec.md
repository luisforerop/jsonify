## MODIFIED Requirements

### Requirement: Manage records through a persistence boundary

The system SHALL expose create, read, update, and delete operations for records
through external client-side hooks. The form-filler interface SHALL use those
hooks rather than accessing browser localStorage directly, and SHALL limit the
records it displays to those belonging to the active collection. The hook
implementation SHALL persist records in the relational store through the server,
and its create, read, update, and delete operations SHALL be asynchronous. A
saved record SHALL remain available after the browser page is reloaded, including
from a different browser or machine using the same server.

#### Scenario: List saved records

- **WHEN** the form-filler view becomes available
- **THEN** it obtains the active collection's records through the persistence hook

#### Scenario: Edit a saved record

- **WHEN** the user loads a previously saved record and submits changed values
- **THEN** the interface updates that record through the persistence hook without creating a duplicate

#### Scenario: Delete a saved record

- **WHEN** the user deletes a saved record
- **THEN** the interface removes that record through the persistence hook and it no longer appears in the saved-records list

#### Scenario: Reload after submitting

- **WHEN** the user reloads the application after submitting a record
- **THEN** the saved record remains available through the persistence hook

#### Scenario: Records are isolated per collection

- **WHEN** two different collections each have records
- **THEN** the form-filler's saved-records list for one collection does not show the other collection's records

## REMOVED Requirements

### Requirement: Name a record for later identification

**Reason**: The strict relational `records` table has no user-given name column
(`id`, `workspaceId`, `collectionId`, `schemaId`, `payload` only). Records are
identified by their source schema and creation date.
**Migration**: The form-filler drops the record-name field and the saved-records
list. Existing display switches to showing the source schema name and the
record's `createdAt`; no name is collected before submitting.
