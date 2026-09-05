## MODIFIED Requirements

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
