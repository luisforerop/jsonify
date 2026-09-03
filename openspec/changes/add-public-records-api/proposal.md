## Why

Today records can only be created and read from inside the Jsonify UI through
collection-scoped hooks. There is no way for an external client to consume the
data a workspace has collected. Once a user builds a schema and captures a first
record, that data should immediately be reachable over a stable, versioned HTTP
API so Jsonify can act as a lightweight backend for the JSON people model in it.

## What Changes

- Add a public, versioned REST API under `/api/v1/collections/<collectionSlug>/records`
  for listing, creating, reading, replacing, and deleting records in a collection.
- Add `GET /api/v1/collections/<collectionSlug>/schema` to retrieve the JSON
  Schema a collection validates against.
- Identify the tenant with a required `x-workspace-id` request header; identify
  the validating schema with an `x-schema` header (schema name or id, scoped to
  the collection) that is **required** on `POST` and `PUT` and optional on the
  schema read endpoint.
- Validate `POST` and `PUT` bodies against the selected JSON Schema with Ajv
  (JSON Schema draft 2020-12), rejecting non-conforming payloads with a `400`
  that lists the problems.
- Allow `POST` as soon as a schema exists in the collection — a record does not
  need to have been created in the UI first.
- Publish records in an envelope independent of the internal storage shape:
  each `Record` exposes `id`, `content` (the submitted values), `schemaVersion`
  (the validating schema's name), and `createdAt` / `updatedAt`. List responses
  return `{ items: Record[], pagination: { total, page, limit } }`, single-record
  responses return `{ data: Record }`, create returns `{ data: Record, id }`,
  delete returns `{ success: true }`.
- Records created through the public API are stored in the same `records`
  collection as UI-created records, associated with the resolved collection and
  schema, and remain visible in the form-filler's saved-records list.
- Serve permissive CORS headers (and an `OPTIONS` preflight handler) on the
  `/api/v1` routes so browser clients on other origins can consume them.

Non-goals: API keys or per-client authentication (the prototype has no auth),
rate limiting, partial updates (`PATCH`), and filtering/sorting query params
beyond pagination.

## Capabilities

### New Capabilities

- `public-records-api`: A versioned, tenant-scoped HTTP API for external clients
  to list, create, read, replace, and delete a collection's records and to read
  its JSON Schema, with header-based workspace and schema selection and
  schema-based payload validation.

### Modified Capabilities

<!-- None. The public API reads collections, schemas, and records owned by the
     workspaces, json-schema-builder, and schema-form-filler capabilities and
     writes records in the shape schema-form-filler already defines; no existing
     requirement changes. -->

## Impact

- New route tree: `app/api/v1/collections/[collectionSlug]/records/route.ts`,
  `app/api/v1/collections/[collectionSlug]/records/[id]/route.ts`,
  `app/api/v1/collections/[collectionSlug]/schema/route.ts`.
- New server helpers: request-context resolution (`x-workspace-id` /
  `x-schema` → workspace, collection, schema), an Ajv-based payload validator, a
  public-record serializer, and shared CORS headers — under `lib/server/`.
- Reuses `listCollection` / `createRecord` / `updateRecord` / `removeRecord`
  from `lib/server/json-store.ts` and the `JsonSchema` type from
  `lib/schema-builder.ts`.
- Adds `ajv` as a runtime dependency; no changes to the JSON file store format.
- Internal `/api/*` routes and the UI hooks are untouched.
