# Projects Specification

## Purpose

Lets users group related JSON Schemas and records into named collections within a workspace, reached through workspace-scoped slug routes, before working in the schema-builder or form-filler.

## Requirements

### Requirement: Create a collection

The system SHALL allow the active user to create a collection within the active
workspace by entering a name and an optional description. The system SHALL
generate a `slug` from the name by lowercasing it and replacing runs of
non-alphanumeric characters with single hyphens. The collection SHALL be stored
with `workspaceId` set to the active workspace. Creating a collection SHALL
require an active workspace.

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
- **THEN** the system reports the conflict and does not create a second collection with that slug in that workspace

### Requirement: List and open collections

The system SHALL display the active workspace's collections and SHALL let the
user open one to enter its view, scoped to that collection.

#### Scenario: View the workspace's collections

- **WHEN** a workspace becomes active
- **THEN** the system obtains that workspace's collections through the persistence hook and displays each by name, showing only collections whose `workspaceId` is the active workspace

#### Scenario: Open a collection

- **WHEN** the user selects a collection from the list
- **THEN** the system enters that collection's view, making it the active collection for the schema-builder and form-filler

#### Scenario: No collections yet

- **WHEN** the active workspace has no collections
- **THEN** the system indicates there are none and prompts the user to create one

### Requirement: Rename a collection

The system SHALL allow the user to rename an existing collection. Renaming SHALL
update the collection's name without creating a duplicate and without changing
its slug.

#### Scenario: Rename an existing collection

- **WHEN** the user edits a collection's name and confirms the change
- **THEN** the system updates that collection's name through the persistence hook without creating a duplicate collection and without changing its slug

### Requirement: Delete a collection and its associated data

The system SHALL allow the user to delete a collection. Deleting a collection
SHALL also delete the saved schemas and records associated with that collection,
since they have no meaning without their owning collection.

#### Scenario: Delete a collection

- **WHEN** the user deletes a collection
- **THEN** the system removes the collection, its saved schemas, and its records through their respective persistence hooks, and the collection no longer appears in the collections list

#### Scenario: Deleting the active collection

- **WHEN** the user deletes the collection that is currently active
- **THEN** the system returns to the active workspace's collections list, since there is no longer an active collection

### Requirement: Navigate within an open collection

The system SHALL let a user navigate from an open collection to that collection's
schema-builder and to its form-filler without leaving the workspace and
collection context.

#### Scenario: Access schema-builder and form-filler from a collection

- **WHEN** the user is inside an open collection
- **THEN** the interface lets them navigate to that collection's schema-builder and to its form-filler, both scoped to that collection and its workspace

### Requirement: Manage collections through a persistence boundary

The system SHALL expose create, read, update, and delete operations for
collections through external client-side hooks. The collections view SHALL use
those hooks rather than accessing browser localStorage directly. The hook
implementation SHALL persist collections in a project-local JSON file through the
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

### Requirement: Reach a collection by workspace and collection slug

The system SHALL make a collection's schema-builder and form-filler reachable at
URLs of the form `/w/<workspaceSlug>/<collectionSlug>/...`. Opening such a URL
SHALL set the corresponding workspace and collection as active when they are
available to the active user.

#### Scenario: Open a collection-scoped URL

- **WHEN** the user navigates to `/w/<workspaceSlug>/<collectionSlug>` for a collection in a workspace owned by the active user
- **THEN** that workspace and collection are treated as active for the pages under that path

#### Scenario: Unknown collection slug

- **WHEN** the user navigates to `/w/<workspaceSlug>/<collectionSlug>` and no such collection is available in that workspace
- **THEN** the system shows a not-found state rather than an empty collection
