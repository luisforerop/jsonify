# users Specification

## Purpose
Provides a prototype user identity for Jsonify — a person who owns workspaces —
without any authentication, so the SaaS hierarchy (User → Workspace → Collection)
can be exercised end to end before real auth exists.

## Requirements

### Requirement: Manage users through a persistence boundary

The system SHALL persist a user profile record in the relational store, identified by the person's Clerk user id rather than a locally-generated id, with asynchronous server-side operations. The profile SHALL be created or updated automatically the first time that Clerk user makes an authenticated request to the server, rather than through a local sign-up form or a client-callable create/update API — the client already gets a signed-in user's own name and email directly from Clerk, so this record is not read back through a client-side hook. A user's profile SHALL remain available after the browser page is reloaded, including from a different browser against the same server, as long as the corresponding Clerk account still exists.

#### Scenario: Profile created on first sign-in

- **WHEN** a person makes their first authenticated request after signing in with Clerk
- **THEN** the system stores a user profile record keyed by that Clerk user id

#### Scenario: Reload after creating a user

- **WHEN** the person reloads the application after their profile was created on an earlier authenticated request
- **THEN** their profile is still stored in the relational store, keyed by their Clerk user id

#### Scenario: Persistence backend is unavailable

- **WHEN** the server cannot reach the database to read or write a profile
- **THEN** the authenticated request still proceeds using Clerk's own session data for identity, and the profile sync is skipped rather than blocking the request
