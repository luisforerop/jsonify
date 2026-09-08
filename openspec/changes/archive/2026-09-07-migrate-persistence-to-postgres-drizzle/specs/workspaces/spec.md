## MODIFIED Requirements

### Requirement: Create a workspace

The system SHALL let the signed-in Clerk user create a workspace by entering a name. The system SHALL generate a `slug` from the name by lowercasing it and replacing runs of non-alphanumeric characters with single hyphens (e.g. "Clean Fuel" → `clean-fuel`). The workspace SHALL be stored with `ownerId` set to the signed-in user's Clerk user id and a `createdAt` timestamp. Uniqueness of the slug among that owner's workspaces SHALL be enforced atomically by a database unique index rather than by a read-compare-write check. Creating a workspace SHALL also record the creator as a member of the workspace with the `owner` role. Creating a workspace SHALL require a signed-in session.

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
- **THEN** the database unique index rejects the insert, the system reports the conflict, and no second workspace with that slug exists for that owner

#### Scenario: Creator is recorded as owner member

- **WHEN** a workspace is created
- **THEN** a membership row exists linking the creator to that workspace with the `owner` role

#### Scenario: No active user

- **WHEN** a workspace creation is attempted with no signed-in session
- **THEN** the system does not create the workspace and responds as unauthenticated instead of prompting for user selection

### Requirement: Manage workspaces through a persistence boundary

The system SHALL expose create and read operations for workspaces through an
external client-side hook that persists workspaces in the relational store
through the server, with asynchronous operations. A created workspace SHALL
remain available after the browser page is reloaded, including from a different
browser against the same server.

#### Scenario: Reload after creating a workspace

- **WHEN** the user reloads the application after creating a workspace
- **THEN** the workspace is still listed through the persistence hook for its owner

#### Scenario: Persistence backend is unavailable

- **WHEN** the hook cannot reach the server to load or create workspaces
- **THEN** the hook surfaces an error state and does not silently discard the action
