## ADDED Requirements

### Requirement: Configure a collection's public read visibility

Every collection SHALL carry an `isPublic` flag, defaulting to `false` when
not specified at creation. The system SHALL let the collection's owner toggle
`isPublic` after creation without affecting the collection's name, slug,
description, schemas, or records. This flag SHALL be the sole control for
whether `/api/v1` read requests against the collection require an API key
(see [[public-records-api]]'s authorization requirement); it SHALL have no
effect on write requests, which always require an API key regardless of
`isPublic`.

#### Scenario: New collections default to private

- **WHEN** a collection is created without specifying `isPublic`
- **THEN** the stored collection has `isPublic: false`

#### Scenario: Mark a collection public

- **WHEN** the owner toggles a collection's visibility to public
- **THEN** the stored collection's `isPublic` becomes `true` and its other fields are unchanged

#### Scenario: Mark a collection private again

- **WHEN** the owner toggles a public collection's visibility back to private
- **THEN** the stored collection's `isPublic` becomes `false`, and `/api/v1` reads against it subsequently require an API key

#### Scenario: Visibility does not affect writes

- **WHEN** a collection's `isPublic` is `true`
- **THEN** creating, replacing, or deleting its records through `/api/v1` still requires a suitably scoped API key

### Requirement: Copyable API request example per collection

The collection's own page SHALL let the owner generate a copyable example
request for calling `/api/v1` against that collection, for a chosen action
of `read`, `write`, or `delete`, rendered as both a `curl` command and a
JavaScript `fetch` call. The example SHALL include the resolved workspace's
`x-workspace-id` header and an `Authorization: Bearer <api-key>` placeholder
(see [[api-key-management]]; the owner's real secret is shown only once at
creation and is never available to prefill here). For the `write` action the
example SHALL additionally include an `x-schema` header and an example JSON
body, matching [[public-records-api]]'s request shape for that action.

#### Scenario: Read example needs no schema header or body

- **WHEN** the owner selects the read action for a collection
- **THEN** the generated example is a `GET` request to that collection's records endpoint, with no `x-schema` header and no body

#### Scenario: Write example includes a schema header and a body

- **WHEN** the owner selects the write action
- **THEN** the generated example is a `POST` request including an `x-schema` header, a `Content-Type: application/json` header, and an example JSON body

#### Scenario: Delete example targets a single record

- **WHEN** the owner selects the delete action
- **THEN** the generated example is a `DELETE` request to that collection's record-by-id endpoint

#### Scenario: Switching format keeps the same request

- **WHEN** the owner switches between the `curl` and `fetch` renderings for the same selected action
- **THEN** both examples target the same method, path, and headers
