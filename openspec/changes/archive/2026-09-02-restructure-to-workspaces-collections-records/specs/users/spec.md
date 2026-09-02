## Purpose

Provides a prototype user identity for Jsonify — a person who owns workspaces —
without any authentication, so the SaaS hierarchy (User → Workspace → Collection)
can be exercised end to end before real auth exists.

## ADDED Requirements

### Requirement: Create a user

The system SHALL let a person create a user by submitting a name, an email, and a
password from a sign-up form. The password SHALL be stored as-is or with a simple
hash; the system SHALL NOT implement authentication middleware, tokens, or
session cookies. On success the new user SHALL become the active user.

#### Scenario: Create a user with all fields

- **WHEN** the person submits the sign-up form with a name, email, and password
- **THEN** the system stores a user record with those fields and a `createdAt` timestamp, and it appears in the users list

#### Scenario: Newly created user becomes active

- **WHEN** a user is created successfully
- **THEN** that user is set as the active user without any further selection

#### Scenario: Reject a user missing required fields

- **WHEN** the person submits the sign-up form without a name, without an email, or without a password
- **THEN** the system reports which field is required and does not create a user

### Requirement: Select the active user

The system SHALL present an always-visible selector listing existing users and
SHALL let the person choose which user is active. The active user SHALL NOT be
persisted across reloads; on reload the selector SHALL require the person to
choose again.

#### Scenario: Choose an existing user

- **WHEN** the person picks a user from the selector
- **THEN** that user becomes the active user and their workspaces become available

#### Scenario: No active user after reload

- **WHEN** the application is reloaded
- **THEN** no user is active and the selector prompts the person to choose one

#### Scenario: No users yet

- **WHEN** the selector is shown and no users exist
- **THEN** it indicates there are no users and prompts the person to create one

### Requirement: Manage users through a persistence boundary

The system SHALL expose create and read operations for users through an external
client-side hook that persists users in the project-local JSON file through the
server, with asynchronous operations. A created user SHALL remain available after
the browser page is reloaded, including from a different browser against the same
server.

#### Scenario: Reload after creating a user

- **WHEN** the person reloads the application after creating a user
- **THEN** the user is still listed through the persistence hook

#### Scenario: Persistence backend is unavailable

- **WHEN** the hook cannot reach the server to load or create users
- **THEN** the hook surfaces an error state and does not silently discard the action
