## Purpose

Provides durable, project-local persistence for projects, saved schemas, and form entries by storing them in a single JSON file on the server's filesystem, reached from the browser through HTTP endpoints.

## ADDED Requirements

### Requirement: Persist all collections in one project-local JSON file

The system SHALL store the `projects`, `schemas`, and `formEntries` collections together in a single JSON file located inside the project directory. The file location SHALL be stable across restarts so the data survives server restarts and is visible in the working tree.

#### Scenario: Data survives a server restart

- **WHEN** records exist in the JSON file and the server process is stopped and started again
- **THEN** the previously stored records are still returned by the read endpoints

#### Scenario: File is human-readable

- **WHEN** the store writes the file
- **THEN** the file contains formatted (indented) JSON with a top-level object exposing the `projects`, `schemas`, and `formEntries` collections

### Requirement: Tolerate a missing or malformed store file

The system SHALL treat a missing store file as an empty store, and SHALL NOT crash when the file exists but cannot be parsed as the expected structure.

#### Scenario: File does not exist yet

- **WHEN** a read endpoint is called and the store file does not exist
- **THEN** the endpoint responds with empty collections and does not error

#### Scenario: File contains invalid JSON

- **WHEN** a read endpoint is called and the store file cannot be parsed
- **THEN** the endpoint responds with empty collections rather than failing the request

#### Scenario: First write creates the file

- **WHEN** a write endpoint is called and neither the store file nor its parent directory exists
- **THEN** the system creates the directory and file and persists the record

### Requirement: Serialize concurrent writes

The system SHALL apply writes to the store file one at a time so that concurrent create, update, or delete requests do not corrupt the file or lose records.

#### Scenario: Two writes arrive together

- **WHEN** two write requests that modify the same collection are processed at overlapping times
- **THEN** both resulting records are present in the file and neither write is lost

### Requirement: Expose CRUD over HTTP for each collection

The system SHALL expose endpoints to list a collection, create a record in it, update a record by id, and delete a record by id, for each of projects, schemas, and form entries. Each created record SHALL receive a unique id and `createdAt`/`updatedAt` timestamps; each update SHALL refresh `updatedAt` without changing `createdAt` or `id`.

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

### Requirement: Reject invalid write payloads

The system SHALL validate incoming create and update payloads against the shape expected for that collection and SHALL reject payloads that do not conform, without modifying the file.

#### Scenario: Malformed create payload

- **WHEN** a client posts a payload missing required fields for the collection
- **THEN** the system responds with a client error and the file is unchanged
