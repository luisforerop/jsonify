## ADDED Requirements

### Requirement: Authorize `/api/v1` requests

After resolving the workspace and collection, the API SHALL authorize every
`/api/v1` request before resolving a schema or touching records. A read
request (`GET` records, `GET` a record by id, or `GET` the collection's
schema) against a collection whose `isPublic` flag is `true` SHALL be
authorized without an API key. Every other request — every read against a
non-public collection, and every write (`POST`, `PUT`, `DELETE`) regardless of
`isPublic` — SHALL require an `Authorization: Bearer <key>` header carrying an
API key that belongs to the resolved workspace and whose scopes cover the
request's action (`read`, `write`, or `delete` per [[api-key-management]]'s
scope convention) for the resolved collection's slug.

A request that requires a key but omits the `Authorization` header SHALL be
rejected with `401` and no data change. A request whose key does not match any
stored key for the resolved workspace SHALL be rejected with `401` and no data
change — including a key that is valid for a *different* workspace, which
SHALL receive the same `401` as an unrecognized key. A request whose key is
valid for the resolved workspace but lacks a scope covering the action and
collection SHALL be rejected with `403` and no data change.

#### Scenario: Public collection read without a key

- **WHEN** a client sends `GET` to a records or schema endpoint for a collection with `isPublic: true` and no `Authorization` header
- **THEN** the API resolves and returns the requested data as usual

#### Scenario: Private collection read without a key

- **WHEN** a client sends `GET` to a records or schema endpoint for a collection with `isPublic: false` (or unset) and no `Authorization` header
- **THEN** the API responds `401` and returns no data

#### Scenario: Write without a key, public or not

- **WHEN** a client sends `POST`, `PUT`, or `DELETE` to a records endpoint without an `Authorization` header, regardless of the collection's `isPublic` value
- **THEN** the API responds `401` and persists no change

#### Scenario: Key with a sufficient scope succeeds

- **WHEN** a client sends `POST` to `/api/v1/collections/recetas/records` with `Authorization: Bearer <key>` where the key belongs to the resolved workspace and its scopes include `write:recetas` (or `write:*` or `*`)
- **THEN** the API proceeds to resolve the schema and create the record as usual

#### Scenario: Key with an insufficient scope is rejected

- **WHEN** a client sends `DELETE` to a record endpoint with a key that belongs to the resolved workspace but whose scopes only include `read:recetas`
- **THEN** the API responds `403` and deletes nothing

#### Scenario: Key from a different workspace is rejected like an unknown key

- **WHEN** a client presents a key that is valid for workspace A against a request resolved to workspace B
- **THEN** the API responds `401`, identically to a key that matches no stored key at all

#### Scenario: Authorization runs before schema resolution

- **WHEN** a client sends an unauthorized request to a schema-dependent endpoint for a collection that has no saved schemas
- **THEN** the API responds with the authorization failure (`401`/`403`), not the `409` that would otherwise indicate a missing schema

## MODIFIED Requirements

### Requirement: Cross-origin access

The `/api/v1` endpoints SHALL send permissive CORS response headers allowing
any origin and the `GET`, `POST`, `PUT`, `DELETE`, and `OPTIONS` methods
together with the `Content-Type`, `Authorization`, `x-workspace-id`,
`x-schema`, and `x-record-name` request headers, and SHALL answer a CORS
preflight `OPTIONS` request with a success status and those headers.

#### Scenario: Preflight request

- **WHEN** a browser client sends an `OPTIONS` request to a `/api/v1` endpoint with CORS preflight headers
- **THEN** the API responds with a success status and CORS headers permitting the actual request

#### Scenario: Actual request carries CORS headers

- **WHEN** a client makes any `/api/v1` request
- **THEN** the response includes the `Access-Control-Allow-Origin` header

#### Scenario: Preflight allows the Authorization header

- **WHEN** a browser client sends a preflight `OPTIONS` request asking to send an `Authorization` header
- **THEN** the API's response lists `Authorization` among the allowed request headers
