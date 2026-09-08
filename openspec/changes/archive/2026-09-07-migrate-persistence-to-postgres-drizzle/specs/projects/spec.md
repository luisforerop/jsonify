## MODIFIED Requirements

### Requirement: Create a collection

The system SHALL allow the active user to create a collection within the active
workspace by entering a name and an optional description. The system SHALL
generate a `slug` from the name by lowercasing it and replacing runs of
non-alphanumeric characters with single hyphens. The collection SHALL be stored
with `workspaceId` set to the active workspace and the optional `description`
when given. Uniqueness of the slug within the workspace SHALL be enforced
atomically by a database unique index rather than by a read-compare-write check.
Creating a collection SHALL require an active workspace.

#### Scenario: Create a collection with a name

- **WHEN** the user enters a name (and optionally a description) and confirms creating a collection while a workspace is active
- **THEN** the system creates a collection with that name, description, a generated slug, and `workspaceId` set to the active workspace, and it appears in that workspace's collections list

#### Scenario: Reject an unnamed collection

- **WHEN** the user attempts to create a collection without entering a name
- **THEN** the system reports that a name is required and does not create a collection

#### Scenario: Reject a collection with no active workspace

- **WHEN** a collection creation is attempted while no workspace is active
- **THEN** the system does not create the collection and indicates that a workspace must be selected first

#### Scenario: Reject a duplicate slug within a workspace

- **WHEN** the user creates a collection whose generated slug matches another collection in the same workspace
- **THEN** the database unique index rejects the insert, the system reports the conflict, and no second collection with that slug exists in that workspace

### Requirement: Delete a collection and its associated data

The system SHALL allow the user to delete a collection. Deleting a collection
SHALL also delete the saved schemas and records associated with that collection,
since they have no meaning without their owning collection. This cascade SHALL be
enforced by the database on delete rather than by successive client-side hook
calls.

#### Scenario: Delete a collection

- **WHEN** the user deletes a collection
- **THEN** the system removes the collection, and its saved schemas and records are removed by database cascade, so the collection and its data no longer appear in any list

#### Scenario: Deleting the active collection

- **WHEN** the user deletes the collection that is currently active
- **THEN** the system returns to the active workspace's collections list, since there is no longer an active collection

### Requirement: Manage collections through a persistence boundary

The system SHALL expose create, read, update, and delete operations for
collections through external client-side hooks. The collections view SHALL use
those hooks rather than accessing browser localStorage directly. The hook
implementation SHALL persist collections in the relational store through the
server, and its create, read, update, and delete operations SHALL be
asynchronous. A saved collection SHALL remain available after the browser page is
reloaded, including from a different browser or machine using the same server,
still associated with its workspace.

#### Scenario: Reload after creating a collection

- **WHEN** the user reloads the application after creating a collection
- **THEN** the saved collection remains available through the persistence hook, still associated with its workspace

#### Scenario: Collection visible from another browser

- **WHEN** a collection is created and the application is then opened in a different browser against the same server
- **THEN** the saved collection is listed through the persistence hook for its workspace

#### Scenario: Persistence backend is unavailable

- **WHEN** the persistence hook cannot reach the server to load or save collections
- **THEN** the hook surfaces an error state and does not silently discard the user's action
