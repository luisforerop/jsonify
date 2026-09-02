## MODIFIED Requirements

### Requirement: Persist all collections in one project-local JSON file

The system SHALL store the `users`, `workspaces`, `collections`, `schemas`, and
`records` collections together in a single JSON file located inside the project
directory. The file location SHALL be stable across restarts so the data survives
server restarts and is visible in the working tree.

#### Scenario: Data survives a server restart

- **WHEN** records exist in the JSON file and the server process is stopped and started again
- **THEN** the previously stored records are still returned by the read endpoints

#### Scenario: File is human-readable

- **WHEN** the store writes the file
- **THEN** the file contains formatted (indented) JSON with a top-level object exposing the `users`, `workspaces`, `collections`, `schemas`, and `records` collections

### Requirement: Expose CRUD over HTTP for each collection

The system SHALL expose endpoints to list a collection, create a record in it,
update a record by id, and delete a record by id, for each of users, workspaces,
collections, schemas, and records. Each created record SHALL receive a unique id
and `createdAt`/`updatedAt` timestamps; each update SHALL refresh `updatedAt`
without changing `createdAt` or `id`.

#### Scenario: List a collection

- **WHEN** a client requests the list endpoint for a collection
- **THEN** the system responds with all records currently stored in that collection

#### Scenario: Create a record

- **WHEN** a client posts a valid new record to a collection endpoint
- **THEN** the system assigns an id and timestamps, appends it to the file, and returns the stored record

#### Scenario: Update a record

- **WHEN** a client updates an existing record by id
- **THEN** the system replaces that record's editable fields, refreshes `updatedAt`, persists the file, and returns the updated record

#### Scenario: Update a missing record

- **WHEN** a client updates a record whose id is not in the collection
- **THEN** the system responds with a not-found result and does not modify the file

#### Scenario: Delete a record

- **WHEN** a client deletes an existing record by id
- **THEN** the system removes it from the file and reports success, and the record no longer appears in the list endpoint

#### Scenario: Delete a missing record

- **WHEN** a client deletes a record whose id is not in the collection
- **THEN** the system reports that nothing was deleted and does not modify the file
