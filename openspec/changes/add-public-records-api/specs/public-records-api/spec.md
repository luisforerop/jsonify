## Purpose

Gives external clients a versioned, tenant-scoped HTTP API to list, create, read,
replace, and delete a collection's records and to read its JSON Schema, so a
Jsonify workspace can serve the JSON data it collects to other systems as soon as
a schema and a record exist.

## ADDED Requirements

### Requirement: Resolve the tenant from the `x-workspace-id` header

Every `/api/v1` request SHALL identify its workspace through an `x-workspace-id`
request header carrying a workspace id. The API SHALL reject a request that omits
the header with `400` and a request whose id matches no workspace with `404`,
without reading or modifying any data. All subsequent resolution (collection,
schema, records) SHALL be scoped to the resolved workspace.

#### Scenario: Missing workspace header

- **WHEN** a client calls any `/api/v1/collections/...` endpoint without an `x-workspace-id` header
- **THEN** the API responds `400` with an error message naming the required header and performs no data change

#### Scenario: Unknown workspace id

- **WHEN** a client sends `x-workspace-id` with a value that matches no stored workspace
- **THEN** the API responds `404` with an error message and performs no data change

#### Scenario: Records stay isolated per workspace

- **WHEN** two workspaces each own a collection with the same slug and a client lists records with one workspace's id
- **THEN** the response contains only that workspace's records and never the other workspace's records

### Requirement: Resolve the collection from the path slug

The API SHALL resolve `<collectionSlug>` in the route path to a collection whose
`slug` matches within the resolved workspace. A slug that matches no collection in
that workspace SHALL produce `404` with an error message and no data change.

#### Scenario: Known collection slug

- **WHEN** a client requests `/api/v1/collections/recetas/records` and the workspace has a collection with slug `recetas`
- **THEN** the API operates on that collection's records

#### Scenario: Unknown collection slug

- **WHEN** a client requests a collection slug that does not exist in the resolved workspace
- **THEN** the API responds `404` with an error message and performs no data change

### Requirement: Select the validating schema

Schema-dependent endpoints SHALL select one of the collection's saved schemas.

Record create (`POST`) and record replace (`PUT`) SHALL require the `x-schema`
header: a write request that omits it SHALL be rejected with `400` naming the
required header, with no data change. The schema read endpoint
(`GET .../schema`) MAY omit `x-schema`; when it is omitted the API SHALL use the
collection's only saved schema, or respond `400` naming the available schemas
when the collection has more than one.

When `x-schema` is provided, the API SHALL match it against the collection's
saved schemas by name (exact) first and then by id, and SHALL respond `404` when
nothing matches. When the collection has no saved schemas, any schema-dependent
endpoint SHALL respond `409` indicating a schema must be created first.

#### Scenario: Write without the schema header

- **WHEN** a client sends `POST` or `PUT` to a records endpoint without an `x-schema` header
- **THEN** the API responds `400` naming the required header and does not create or modify a record

#### Scenario: Explicit schema by name

- **WHEN** a client sends `x-schema: Receta` and the collection has a schema named `Receta`
- **THEN** the API validates against and reports that schema

#### Scenario: Explicit schema by id

- **WHEN** a client sends `x-schema` with the id of one of the collection's schemas and no schema name matches that value
- **THEN** the API selects the schema with that id

#### Scenario: Schema endpoint with a single schema and no header

- **WHEN** a client calls `GET .../schema` without `x-schema` and the collection has exactly one saved schema
- **THEN** the API returns that schema without requiring the header

#### Scenario: Schema endpoint with multiple schemas and no header

- **WHEN** a client calls `GET .../schema` without `x-schema` and the collection has two or more saved schemas
- **THEN** the API responds `400` listing the schema names

#### Scenario: Unknown schema header

- **WHEN** a client sends `x-schema` with a value that matches no schema name or id in the collection
- **THEN** the API responds `404` with an error message

#### Scenario: Collection has no schema

- **WHEN** a client calls a schema-dependent endpoint for a collection that has no saved schemas
- **THEN** the API responds `409` indicating that a schema must be created first

### Requirement: List records in a collection

`GET /api/v1/collections/<collectionSlug>/records` SHALL return the collection's
records as `{ items: Record[], pagination: { total, page, limit } }`, where
`items` is the requested page, `pagination.total` is the count of all records in
the collection (before pagination), and `pagination.page` / `pagination.limit`
echo the effective values used. The endpoint SHALL accept `page` (1-based,
default `1`) and `limit` (default `20`) query parameters, clamp out-of-range or
non-numeric values to their defaults, and return an empty `items` array with the
correct `pagination.total` when the page is beyond the last record. Listing SHALL
NOT require a schema.

#### Scenario: List with default pagination

- **WHEN** a client requests `/api/v1/collections/recetas/records` and the collection has 3 records
- **THEN** the API responds `200` with `items` holding all 3 records and `pagination` equal to `{ total: 3, page: 1, limit: 20 }`

#### Scenario: Second page

- **WHEN** a client requests `?page=2&limit=20` and the collection has 25 records
- **THEN** the API responds with `items` holding the remaining 5 records and `pagination.total` equal to `25`

#### Scenario: Empty collection

- **WHEN** a client lists records for a collection that has none
- **THEN** the API responds `200` with `items` as `[]` and `pagination.total` as `0`

#### Scenario: Page past the end

- **WHEN** a client requests `?page=99` for a collection with 3 records
- **THEN** the API responds `200` with `items` as `[]` and `pagination.total` as `3`

### Requirement: Create a record

`POST /api/v1/collections/<collectionSlug>/records` SHALL require the `x-schema`
header, accept a JSON object as the record data, validate it against the selected
schema, and on success persist a new record associated with the resolved
collection and schema, returning `201` with `{ data: Record, id }`. A record
created this way SHALL appear in the same saved-records list the form-filler
shows for that collection. The endpoint SHALL respond `400` when `x-schema` is
missing, when the body is not a JSON object, or when the body fails schema
validation — the validation error SHALL describe the offending fields — and SHALL
persist nothing in that case.

#### Scenario: Valid payload

- **WHEN** a client posts a JSON object that conforms to the selected schema
- **THEN** the API responds `201` with `{ data: Record, id }`, the record is stored for the collection and schema, and the record is retrievable through the list and get-by-id endpoints

#### Scenario: Payload violates the schema

- **WHEN** a client posts a JSON object that is missing a required property or has a property of the wrong type
- **THEN** the API responds `400` with an error message listing the offending fields and stores nothing

#### Scenario: Body is not a JSON object

- **WHEN** a client posts a body that is not a JSON object (for example a string, array, or malformed JSON)
- **THEN** the API responds `400` with an error message and stores nothing

#### Scenario: Create works before any UI record exists

- **WHEN** a collection has a saved schema but no records and a client posts a valid payload
- **THEN** the API creates the first record successfully

### Requirement: Validate write payloads against the JSON Schema

The API SHALL validate `POST` and `PUT` bodies against the selected schema's JSON
Schema document using a standards-compliant JSON Schema validator. A failing
payload SHALL produce `400` with `{ error, details }` where `details` is a list
of human-readable messages naming the offending locations. When the stored schema
document itself cannot be processed by the validator, the API SHALL respond with
a `422` indicating the stored schema is invalid, rather than a generic failure,
and SHALL persist nothing.

#### Scenario: Extra properties are accepted

- **WHEN** a client posts a payload that satisfies the schema but also includes properties the schema does not declare
- **THEN** the API accepts and stores the record (the schema does not forbid additional properties)

#### Scenario: Every validation error is reported

- **WHEN** a client posts a payload with more than one violation
- **THEN** the `details` list in the `400` response contains an entry for each violation, not only the first

#### Scenario: Stored schema is not processable

- **WHEN** a schema-dependent write is attempted and the selected schema's document cannot be compiled by the validator
- **THEN** the API responds `422` indicating the stored schema is invalid and stores nothing

### Requirement: Read a record by id

`GET /api/v1/collections/<collectionSlug>/records/:id` SHALL return
`{ data: Record }` for the record with that id in the resolved collection, and
`404` when no record in that collection has the id. Reading SHALL NOT require a
schema.

#### Scenario: Existing record

- **WHEN** a client requests a record id that exists in the collection
- **THEN** the API responds `200` with `{ data: Record }`

#### Scenario: Record id not in this collection

- **WHEN** a client requests a record id that does not exist in the resolved collection (including an id that belongs to another collection)
- **THEN** the API responds `404` with an error message

### Requirement: Replace a record

`PUT /api/v1/collections/<collectionSlug>/records/:id` SHALL require the
`x-schema` header, accept a complete JSON object, validate it against the
selected schema, and on success replace the record's data, refresh its update
timestamp, and return `{ data: Record }`. The endpoint SHALL respond `404` when
the id is not in the collection and `400` when `x-schema` is missing, when the
body is not a JSON object, or when the body fails validation, persisting nothing
on failure.

#### Scenario: Valid replacement

- **WHEN** a client sends a `PUT` with a full JSON object that conforms to the selected schema for an existing record id
- **THEN** the API responds `200` with `{ data: Record }` reflecting the new values and an updated modification timestamp

#### Scenario: Replacement violates the schema

- **WHEN** a client sends a `PUT` body that fails schema validation
- **THEN** the API responds `400` with an error message and leaves the stored record unchanged

#### Scenario: Replacing a missing record

- **WHEN** a client sends a `PUT` for a record id not present in the collection
- **THEN** the API responds `404` and stores nothing

### Requirement: Delete a record

`DELETE /api/v1/collections/<collectionSlug>/records/:id` SHALL remove the record
with that id from the resolved collection and respond `200` with
`{ success: true }`. When the id is not present in the collection the API SHALL
respond `404` with an error message and remove nothing. Deleting SHALL NOT
require a schema.

#### Scenario: Delete an existing record

- **WHEN** a client deletes a record id that exists in the collection
- **THEN** the API responds `200` with `{ success: true }` and the record no longer appears in the list or get-by-id endpoints

#### Scenario: Delete a missing record

- **WHEN** a client deletes a record id not present in the collection
- **THEN** the API responds `404` with an error message and removes nothing

### Requirement: Read the collection's JSON Schema

`GET /api/v1/collections/<collectionSlug>/schema` SHALL return `{ schema }` where
`schema` is the JSON Schema document of the selected schema for the collection.
Unlike the write endpoints, the `x-schema` header is optional here: when it is
omitted the endpoint SHALL fall back to the collection's only schema (or `400`
when the collection has more than one, per "Select the validating schema").

#### Scenario: Collection with a single schema

- **WHEN** a client requests the schema endpoint without `x-schema` and the collection has exactly one saved schema
- **THEN** the API responds `200` with `{ schema }` containing that schema's JSON Schema document

#### Scenario: Collection with multiple schemas and an explicit header

- **WHEN** a client requests the schema endpoint with `x-schema` naming one of several schemas
- **THEN** the API responds `200` with `{ schema }` for the named schema

#### Scenario: Collection with no schema

- **WHEN** a client requests the schema endpoint for a collection that has no saved schemas
- **THEN** the API responds `409` indicating that a schema must be created first

### Requirement: Public record envelope

A `Record` in every `/api/v1` response SHALL be an object exposing the record's
`id`, its submitted values under `content`, the name of the validating schema
under `schemaVersion`, and `createdAt` / `updatedAt` timestamps. The envelope
SHALL NOT leak internal storage-only fields (such as the internal schema id,
collection id, or a generated display name) at the top level of the `Record`.
The shape SHALL be identical across list, get, create, and replace responses.

#### Scenario: Record shape is consistent

- **WHEN** a client obtains the same record through the list endpoint and through the get-by-id endpoint
- **THEN** the `Record` object is identical in both responses and contains `id`, `schemaVersion`, `content`, `createdAt`, and `updatedAt`

#### Scenario: Internal fields are not exposed

- **WHEN** a client reads any record through the public API
- **THEN** the `Record` object does not expose internal association fields at its top level; the submitted values are nested under `content`

### Requirement: Cross-origin access

The `/api/v1` endpoints SHALL send permissive CORS response headers allowing any
origin and the `GET`, `POST`, `PUT`, `DELETE`, and `OPTIONS` methods together
with the `Content-Type`, `x-workspace-id`, `x-schema`, and `x-record-name`
request headers, and
SHALL answer a CORS preflight `OPTIONS` request with a success status and those
headers.

#### Scenario: Preflight request

- **WHEN** a browser client sends an `OPTIONS` request to a `/api/v1` endpoint with CORS preflight headers
- **THEN** the API responds with a success status and CORS headers permitting the actual request

#### Scenario: Actual request carries CORS headers

- **WHEN** a client makes any `/api/v1` request
- **THEN** the response includes the `Access-Control-Allow-Origin` header
