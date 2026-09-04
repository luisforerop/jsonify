# Api Key Management Specification

## Purpose

Lets a workspace owner mint, review, and revoke API keys scoped to that
workspace, each carrying an explicit array of CRUD permissions, so external
and internal integrations can be given exactly the collection access they
need without sharing the workspace id alone.

## Requirements

### Requirement: Scope convention for CRUD access

An API key SHALL carry an array of scope strings. Each scope SHALL be one of:
`*` (every action on every collection in the key's workspace), `<action>:*`
(that action on every collection), or `<action>:<collectionSlug>` (that
action on one collection), where `action` is `read`, `write`, or `delete`.
`read` SHALL govern list and get operations (and reading a collection's
schema), `write` SHALL govern both creating and replacing records, and
`delete` SHALL govern removing records. A scope that does not match this
format SHALL be rejected.

#### Scenario: Valid scope forms are accepted

- **WHEN** a key is created with scopes `["*"]`, or `["read:*"]`, or `["write:recetas", "delete:recetas"]`
- **THEN** the key is created with exactly those scopes

#### Scenario: Malformed scope is rejected

- **WHEN** a key is created with a scope string that is not `*`, `<action>:*`, or `<action>:<collectionSlug>` for `action` in `read`/`write`/`delete` (for example `admin:recetas` or `read`)
- **THEN** the system rejects the request with an error naming the invalid scope and creates no key

### Requirement: Scopes are chosen from collections and actions, not typed

The key-creation UI SHALL let the owner build a key's scopes by selecting,
for each workspace collection (or "all collections"), which of `read`,
`write`, and `delete` to grant, rather than requiring the owner to type scope
strings by hand. The UI SHALL derive each scope string from that selection
using the format defined above, so a scope the UI submits is always
well-formed.

#### Scenario: Selecting a collection and action grants the matching scope

- **WHEN** the owner checks "Write" for one specific collection
- **THEN** the created key's scopes include `write:<that collection's slug>`

#### Scenario: Selecting an action for all collections grants a wildcard scope

- **WHEN** the owner checks an action for "All collections"
- **THEN** the created key's scopes include `<action>:*`

### Requirement: Create an API key for a workspace

The system SHALL let a workspace owner create an API key by providing a
display name and an array of scopes, scoped to one workspace. The system
SHALL generate a random secret, store only its hash and a short display
prefix, and return the full secret in the create response exactly once. The
system SHALL reject a create request whose name is empty or whose
`workspaceId` does not identify an existing workspace.

#### Scenario: Create a key with scopes

- **WHEN** the owner submits a name and a list of valid scopes for a workspace
- **THEN** the system creates the key associated with that workspace, stores its hash (not the raw secret), and returns the raw secret and the key's metadata in the response

#### Scenario: Secret is shown only once

- **WHEN** a key has been created and the owner later lists that workspace's keys
- **THEN** the raw secret is not present anywhere in the list response, only the key's display prefix and metadata

#### Scenario: Reject an unnamed key

- **WHEN** the owner submits a create request without a name
- **THEN** the system reports that a name is required and creates no key

### Requirement: List a workspace's API keys without exposing secrets

The system SHALL let a caller list the API keys belonging to one workspace,
identified by a required workspace id. Each listed key SHALL include its
name, display prefix, scopes, creation timestamp, and last-used timestamp,
and SHALL NOT include the key's hash or any form of the raw secret. A list
request that omits the workspace id SHALL be rejected.

#### Scenario: List a workspace's keys

- **WHEN** a caller requests the API keys for a workspace that has two keys
- **THEN** the system returns both keys' metadata (name, prefix, scopes, timestamps) and neither key's hash or raw secret

#### Scenario: Missing workspace id

- **WHEN** a caller requests the API key list without a workspace id
- **THEN** the system rejects the request with an error and returns no keys

#### Scenario: Keys are isolated per workspace

- **WHEN** two workspaces each have API keys and a caller lists one workspace's keys
- **THEN** the response contains only that workspace's keys

### Requirement: Revoke an API key

The system SHALL let a caller permanently revoke an API key by deleting it. A
revoked key SHALL immediately stop authorizing any `/api/v1` request. Deleting
an id that does not identify an existing key SHALL be reported as not found
and SHALL change nothing.

#### Scenario: Revoke an existing key

- **WHEN** a caller deletes an existing API key
- **THEN** the key is removed and no longer appears in the workspace's key list

#### Scenario: A revoked key stops working immediately

- **WHEN** a client presents a key that has just been revoked to a `/api/v1` endpoint
- **THEN** the request is rejected as unauthorized

#### Scenario: Revoke an unknown key

- **WHEN** a caller attempts to delete a key id that does not exist
- **THEN** the system reports it was not found and removes no key
