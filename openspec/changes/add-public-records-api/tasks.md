## 1. Server helpers

- [x] 1.1 Add `ajv` to `package.json` dependencies and run the install.
- [x] 1.2 Add `lib/server/cors.ts` exporting `CORS_HEADERS` (allow `*`, methods `GET, POST, PUT, DELETE, OPTIONS`, headers `Content-Type, x-workspace-id, x-schema, x-record-name`) and `preflight()` returning a `204` response with those headers.
- [x] 1.3 Add `lib/server/validate-payload.ts`: a module-level `Ajv2020` instance (`strict: false`, `allErrors: true`), a compiled-validator cache keyed by schema id + `updatedAt`, and `validatePayload(storedSchema, value)` → `{ valid, details: string[] }`; catch `ajv.compile` failures and surface them as an "uncompilable schema" outcome (maps to `422`).
- [x] 1.4 Add `lib/server/validate-payload.test.ts`: valid object passes; wrong scalar type, missing required, non-integer for `integer`, non-array for `array`, nested/array-item violation each appear in `details`; multiple violations all reported; extra properties accepted; a representative schema-builder output compiles; an uncompilable schema returns the `422` outcome.
- [x] 1.5 Add `lib/server/public-record.ts` with `toPublicRecord(stored)` → `{ id, data, createdAt, updatedAt }` (data from `stored.values`), plus the `PublicRecord` type.
- [x] 1.6 Add `lib/server/public-api-context.ts` with `resolvePublicContext(request, collectionSlug, { schema })` (`schema: "none" | "optional" | "required"`) returning `{ ok: true, workspace, collection, schema? }` or `{ ok: false, response }`; implement the resolution order and status codes from design decision 2 (missing workspace header → 400, unknown workspace → 404, unknown collection-in-workspace → 404, no schemas → 409, unknown `x-schema` → 404, missing `x-schema` when required → 400, ambiguous when optional → 400).
- [x] 1.7 Add `lib/server/public-api-context.test.ts` covering each failure branch and the success branches (explicit `x-schema` by name and by id; `schema: "required"` rejects a missing header; `schema: "optional"` uses the sole schema and 400s when ambiguous; no-schema 409).

## 2. Records collection route

- [x] 2.1 Create `app/api/v1/collections/[collectionSlug]/records/route.ts` with `export const dynamic = "force-dynamic"` and an `OPTIONS` that returns `preflight()`.
- [x] 2.2 Implement `GET`: resolve context (`schema: "none"`), read the collection's records (filter `records` by `collectionId`), parse/clamp `page` (default 1) and `limit` (default 20), respond `{ data: PublicRecord[], total }` with `CORS_HEADERS`.
- [x] 2.3 Implement `POST`: resolve context (`schema: "required"`), require a JSON-object body (else 400), run `validatePayload` (invalid → `400 { error, details }`; uncompilable schema → `422`), build the internal record input (`name` from `x-record-name` or `${schema.name} ${Date.now()}`, `collectionId`, `schemaId`, `schemaName`, `values`), call `createRecord`, respond `201 { data: PublicRecord, id }`.

## 3. Single-record route

- [x] 3.1 Create `app/api/v1/collections/[collectionSlug]/records/[id]/route.ts` with `dynamic = "force-dynamic"` and an `OPTIONS` returning `preflight()`.
- [x] 3.2 Implement `GET`: resolve context (`schema: "none"`), find the record by `id` scoped to `collectionId`; `404` if absent; else `{ data: PublicRecord }`.
- [x] 3.3 Implement `PUT`: resolve context (`schema: "required"`), confirm the record exists in this collection (else `404`), require a JSON-object body and pass `validatePayload` (invalid → `400`; uncompilable schema → `422`), call `updateRecord` with `{ values: body }` (keep existing `name`), respond `{ data: PublicRecord }`.
- [x] 3.4 Implement `DELETE`: resolve context (`schema: "none"`), confirm the record exists in this collection (else `404`), call `removeRecord`, respond `{ success: true }`.

## 4. Schema route

- [x] 4.1 Create `app/api/v1/collections/[collectionSlug]/schema/route.ts` with `dynamic = "force-dynamic"` and an `OPTIONS` returning `preflight()`.
- [x] 4.2 Implement `GET`: resolve context (`schema: "optional"`), respond `{ schema }` with the selected schema's `schema` document and `CORS_HEADERS`.

## 5. Route integration tests

- [x] 5.1 Add a test for the records route: seed a workspace + collection + schema via `JSONIFY_DATA_DIR`; POST a valid record → 201 and it appears in GET list; POST an invalid record → 400; GET list pagination (`page`/`limit`, `total`, page past end → empty).
- [x] 5.2 Add a test for the single-record route: GET/PUT/DELETE happy paths; `404` for an id from another collection; PUT without `x-schema` → 400; PUT invalid body → 400 and record unchanged.
- [x] 5.3 Add a test covering header resolution across routes: missing `x-workspace-id` → 400; unknown workspace → 404; unknown collection slug → 404; `POST`/`PUT` without `x-schema` → 400; `GET .../schema` with 2 schemas and no `x-schema` → 400; no schema → 409; `OPTIONS` preflight → success with CORS headers.

## 6. Validation and docs

- [x] 6.1 Run `openspec validate add-public-records-api --strict` and resolve any findings.
- [ ] 6.2 Run `npm test` and `npm run lint`; fix failures.
- [x] 6.3 Add a short "Public API" section to `README.md` documenting the six endpoints, the `x-workspace-id` / `x-schema` headers, and the response envelopes.
