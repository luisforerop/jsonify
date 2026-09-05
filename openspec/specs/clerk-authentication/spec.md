# clerk-authentication Specification

## Purpose

Provides real, hosted authentication for Jsonify via Clerk — sign-in, sign-up, sign-out, a persisted session, and protection of authenticated pages and APIs — replacing the passwordless prototype login.

## Requirements

### Requirement: Sign up and sign in via Clerk

The system SHALL let a visitor create an account or sign in to an existing one using Clerk's hosted sign-up and sign-in flows. No custom password form SHALL be presented by the application.

#### Scenario: New visitor signs up

- **WHEN** an unauthenticated visitor completes Clerk's sign-up flow with a valid identifier and credential
- **THEN** a Clerk account is created and the visitor becomes signed in

#### Scenario: Returning visitor signs in

- **WHEN** a visitor with an existing Clerk account completes Clerk's sign-in flow with valid credentials
- **THEN** the visitor becomes signed in as that account

### Requirement: Session persists across reloads

The system SHALL keep a visitor signed in across page reloads and new browser tabs against the same browser profile, without requiring the visitor to choose an identity again.

#### Scenario: Reload keeps the visitor signed in

- **WHEN** a signed-in visitor reloads the page
- **THEN** the visitor remains signed in as the same account with no re-authentication prompt

#### Scenario: No session for a new visitor

- **WHEN** a visitor who has never signed in loads the application
- **THEN** the system treats them as signed out and offers sign-in and sign-up

### Requirement: Sign out

The system SHALL let a signed-in visitor sign out, ending their session.

#### Scenario: Signed-in visitor signs out

- **WHEN** a signed-in visitor triggers sign-out
- **THEN** the session ends and subsequent requests are treated as unauthenticated until the visitor signs in again

### Requirement: Protect authenticated pages

The system SHALL require a signed-in session to access pages that manage a user's workspaces or collections (for example, the workspaces list and `/w/<workspaceSlug>` pages). An unauthenticated visitor requesting such a page SHALL be redirected to sign-in.

#### Scenario: Unauthenticated visitor requests a protected page

- **WHEN** a visitor with no session requests a page that requires authentication
- **THEN** the system redirects them to sign-in instead of rendering the page

#### Scenario: Authenticated visitor requests a protected page

- **WHEN** a signed-in visitor requests a page that requires authentication
- **THEN** the system renders the page for that visitor's account

### Requirement: Protect authenticated API routes

The system SHALL require a signed-in session for API routes that create, list, or modify a user's workspaces or collections. These routes SHALL reject unauthenticated requests with an HTTP 401 response. This requirement SHALL NOT apply to the public `/api/v1` records API, which continues to authorize solely via API keys and each collection's `isPublic` flag.

#### Scenario: Unauthenticated request to a protected API route

- **WHEN** a request with no valid Clerk session hits a workspace or collection management API route
- **THEN** the system responds with 401 and does not perform the requested action

#### Scenario: Authenticated request to a protected API route

- **WHEN** a request with a valid Clerk session hits a workspace or collection management API route
- **THEN** the system performs the requested action scoped to that session's account

#### Scenario: Public records API is unaffected

- **WHEN** a request with no Clerk session hits `/api/v1/collections/:slug/records` for a collection with `isPublic: true`
- **THEN** the system serves the request as before, without requiring a Clerk session
