## MODIFIED Requirements

### Requirement: Manage users through a persistence boundary

The system SHALL persist a user profile record in the project-local JSON store, identified by the person's Clerk user id rather than a locally-generated id, with asynchronous server-side operations. The profile SHALL be created or updated automatically the first time that Clerk user makes an authenticated request to the server, rather than through a local sign-up form or a client-callable create/update API — the client already gets a signed-in user's own name and email directly from Clerk, so this record is not read back through a client-side hook. A user's profile SHALL remain available after the browser page is reloaded, including from a different browser against the same server, as long as the corresponding Clerk account still exists.

#### Scenario: Profile created on first sign-in

- **WHEN** a person makes their first authenticated request after signing in with Clerk
- **THEN** the system stores a user profile record keyed by that Clerk user id

#### Scenario: Reload after creating a user

- **WHEN** the person reloads the application after their profile was created on an earlier authenticated request
- **THEN** their profile is still stored in the JSON store, keyed by their Clerk user id

#### Scenario: Persistence backend is unavailable

- **WHEN** the server cannot reach the local JSON store to read or write a profile
- **THEN** the authenticated request still proceeds using Clerk's own session data for identity, and the profile sync is skipped rather than blocking the request

## REMOVED Requirements

### Requirement: Create a user

**Reason**: Account creation is now handled by Clerk's hosted sign-up flow (see the `clerk-authentication` capability); the application no longer collects or stores a password itself.

**Migration**: Use Clerk sign-up. Any existing prototype users created through the old form are not carried over; there is no prior password to migrate since accounts must be recreated in Clerk.

### Requirement: Select the active user

**Reason**: The active user is now derived automatically from the signed-in Clerk session (see the `clerk-authentication` capability) instead of being chosen manually from an always-visible selector.

**Migration**: None required for callers — code that read the active user from session context continues to do so; the value now comes from the Clerk session instead of manual selection.
