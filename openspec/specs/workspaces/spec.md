# workspaces Specification

## Purpose
Introduces the tenant layer of Jsonify: a workspace is owned by a user and holds
all of that tenant's collections, schemas, and records, so data can later be
isolated and billed per workspace.

## Requirements

### Requirement: Create a workspace

The system SHALL let the signed-in Clerk user create a workspace by entering a name. The system SHALL generate a `slug` from the name by lowercasing it and replacing runs of non-alphanumeric characters with single hyphens (e.g. "Clean Fuel" → `clean-fuel`). The workspace SHALL be stored with `ownerId` set to the signed-in user's Clerk user id and a `createdAt` timestamp. Creating a workspace SHALL require a signed-in session.

#### Scenario: Create a workspace with a name

- **WHEN** the signed-in user enters a workspace name and confirms
- **THEN** the system stores a workspace with that name, a generated slug, and `ownerId` set to that user's Clerk user id, and it appears in that user's workspace list

#### Scenario: Slug generation from the name

- **WHEN** the user creates a workspace named "Clean Fuel"
- **THEN** the stored workspace has slug `clean-fuel`

#### Scenario: Reject an unnamed workspace

- **WHEN** the user confirms creation without entering a name
- **THEN** the system reports that a name is required and does not create a workspace

#### Scenario: Reject a duplicate slug for the same owner

- **WHEN** the signed-in user creates a workspace whose generated slug matches one they already own
- **THEN** the system reports the conflict and does not create a second workspace with that slug

#### Scenario: No active user

- **WHEN** a workspace creation is attempted with no signed-in session
- **THEN** the system does not create the workspace and responds as unauthenticated instead of prompting for user selection

### Requirement: List and select a workspace

The system SHALL show the active user's workspaces and SHALL let the user select
one as the active workspace. The active workspace SHALL scope collection listing
and creation. Like the active user, the active workspace SHALL NOT be persisted
across reloads.

#### Scenario: View the active user's workspaces

- **WHEN** a user becomes active
- **THEN** the system lists the workspaces whose `ownerId` is that user and no others

#### Scenario: Select a workspace

- **WHEN** the user selects a workspace from the list
- **THEN** that workspace becomes active and its collections become available for listing and creation

#### Scenario: No workspaces yet

- **WHEN** the active user has no workspaces
- **THEN** the system indicates there are none and prompts the user to create one

### Requirement: Reach a workspace by slug

The system SHALL make a workspace's collections reachable at a URL that contains
the workspace slug (`/w/<workspaceSlug>/...`). Opening such a URL SHALL set that
workspace as active when it belongs to the active user.

#### Scenario: Open a workspace-scoped URL

- **WHEN** the user navigates to `/w/<workspaceSlug>/...` for a workspace owned by the active user
- **THEN** that workspace is treated as active for the pages under that path

#### Scenario: Unknown workspace slug

- **WHEN** the user navigates to `/w/<workspaceSlug>/...` and no workspace with that slug is available to the active user
- **THEN** the system shows a not-found state rather than an empty workspace

### Requirement: Manage workspaces through a persistence boundary

The system SHALL expose create and read operations for workspaces through an
external client-side hook that persists workspaces in the project-local JSON file
through the server, with asynchronous operations. A created workspace SHALL
remain available after the browser page is reloaded, including from a different
browser against the same server.

#### Scenario: Reload after creating a workspace

- **WHEN** the user reloads the application after creating a workspace
- **THEN** the workspace is still listed through the persistence hook for its owner

#### Scenario: Persistence backend is unavailable

- **WHEN** the hook cannot reach the server to load or create workspaces
- **THEN** the hook surfaces an error state and does not silently discard the action
