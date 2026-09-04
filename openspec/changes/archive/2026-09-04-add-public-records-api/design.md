## Context

See `proposal.md` — Why. Relevant current state:

- Records, schemas, collections, and workspaces all live in one JSON file behind
  `lib/server/json-store.ts`, which exposes `listCollection`, `createRecord`,
  `updateRecord`, `removeRecord` keyed by collection name.
- Collections carry a generated `slug` unique per `workspaceId`
  (`lib/server/slug.ts`, `createSluggedResponse`).
- Saved schemas are records in the `schemas` collection with
  `{ name, schema: JsonSchema, workspaceId, collectionId }`
  (`lib/server/validation.ts` → `SavedSchemaInput`).
- Records are records in the `records` collection with
  `{ name, collectionId, schemaId, schemaName, values: FormValues }`.
- Existing internal routes under `app/api/*` are thin wrappers over
  `lib/server/collection-handlers.ts`; the UI hooks consume them. They stay
  untouched.
- There is **no** runtime JSON Schema validator in the codebase. `lib/schema-form.ts`
  only derives form fields and checks required-field presence — no type checks.
- Next.js 16 route handlers: one `route.ts` per segment, `RouteContext<'/path'>`
  for typed `params` (async), `export const dynamic = "force-dynamic"` to opt out
  of caching (already used by `app/api/records/route.ts`).

## Goals / Non-Goals

**Goals:**

- A `/api/v1` route tree that is independent of the internal `/api/*` routes and
  the UI, so its response envelope can stay stable regardless of storage changes.
- One place that turns request headers + path into a resolved
  `{ workspace, collection, schema? }` context, with consistent error responses.
- Standards-correct payload validation against the stored JSON Schema via Ajv,
  so validation keeps up with whatever the schema-builder emits now and later.
- Public records that hide internal association fields.

**Non-Goals:**

- Exposing raw Ajv error objects to clients — errors are flattened to a
  `details: string[]` list.
- Middleware-based routing or a shared `middleware.ts`; per-route resolution is
  enough at this scale.
- Reworking how the UI creates records.

## Decisions

### 1. New `app/api/v1/...` tree, not an extension of `/api/*`

Route files:

- `app/api/v1/collections/[collectionSlug]/records/route.ts` — `GET`, `POST`, `OPTIONS`
- `app/api/v1/collections/[collectionSlug]/records/[id]/route.ts` — `GET`, `PUT`, `DELETE`, `OPTIONS`
- `app/api/v1/collections/[collectionSlug]/schema/route.ts` — `GET`, `OPTIONS`

Each sets `export const dynamic = "force-dynamic"` (reads request headers + the
store on every call). **Why not reuse `collection-handlers.ts`:** those helpers
assume a single flat collection and an internal envelope (they return the raw
`StoredRecord`). The public API needs slug/header resolution, schema validation,
pagination metadata, and a different envelope. A separate thin handler layer is
clearer than overloading the internal one.

**Alternative considered:** a single catch-all `app/api/v1/[...path]/route.ts`
that parses the path itself. Rejected — loses Next's routing/type help and makes
method handling manual.

### 2. Request-context resolver in `lib/server/public-api-context.ts`

A function `resolvePublicContext(request, collectionSlug, { schema })` where
`schema` is `"none" | "optional" | "required"`. It returns either
`{ ok: true, workspace, collection, schema? }` or `{ ok: false, response }` where
`response` is the ready-to-return error `Response`.

Resolution order (fail fast, no writes on any failure):

1. `x-workspace-id` header present → else `400` (`"Missing x-workspace-id header"`).
2. Workspace with that `id` exists → else `404`.
3. Collection in `store.collections` with `slug === collectionSlug` **and**
   `workspaceId === workspace.id` → else `404`.
4. Unless `schema === "none"`: load `store.schemas` filtered by
   `collectionId === collection.id`:
   - zero schemas → `409` (`"Create a schema for this collection first"`).
   - `x-schema` present → match by `name` (case-sensitive, exact), then by `id`;
     no match → `404`.
   - `x-schema` absent and `schema === "required"` → `400`
     (`"Missing x-schema header"`).
   - `x-schema` absent and `schema === "optional"`: exactly one schema → use it;
     ≥2 schemas → `400` with the list of names.

`GET records`, `GET records/:id`, `DELETE` call it with `schema: "none"`.
`POST` and `PUT` call it with `schema: "required"`. `GET schema` calls it with
`schema: "optional"`.

**Why headers over query params / body:** matches the user's stated interface
(`x-workspace-id`, `x-schema`) and keeps tenant identity out of cacheable URLs.

**Why match `x-schema` by name first:** the user's example (`x-schema: recetas`-style)
reads as a human-facing name; id is the fallback for disambiguation.

### 3. Ajv-based validator in `lib/server/validate-payload.ts`

Use **Ajv** (`ajv` package, draft 2020-12 build) for validation:

```ts
import Ajv2020 from "ajv/dist/2020";
const ajv = new Ajv2020({ allErrors: true, strict: false });
```

- `strict: false` — the builder emits `$schema` and `title` and may omit
  `properties` on empty objects; strict mode would throw on some of these.
- `allErrors: true` — report every problem, not just the first.
- A module-level `ajv` instance with a small `Map<schemaId, ValidateFunction>`
  cache keyed by the stored schema's id + `updatedAt`, so repeated requests
  against the same schema reuse the compiled validator.

`validatePayload(storedSchema, value)` → `{ valid: boolean, details: string[] }`.
`details` is `ajv.errors` flattened to strings like
`"/ingredientes/0/cantidad must be number"` via `` `${e.instancePath || "/"} ${e.message}` ``.

`POST` / `PUT` return `400 { error: "Validation failed", details }` when invalid.

**Why Ajv over a hand-rolled validator:** it is the de-facto standard, tracks the
JSON Schema spec, and means validation does not silently fall behind as the
schema-builder gains keywords (`enum`, `minLength`, `pattern`, …). The cost is
one well-maintained dependency.

**Note on `additionalProperties`:** the builder never emits
`additionalProperties: false`, so extra keys in a payload pass — acceptable and
consistent with JSON Schema defaults.

### 4. Public record envelope in `lib/server/public-record.ts`

`toPublicRecord(stored: StoredRecord)` →
`{ id, schemaVersion: stored.schemaName, content: stored.values, createdAt, updatedAt }`.

Responses:

| Endpoint            | Body                                                    |
| ------------------- | ------------------------------------------------------ |
| `GET .../records`   | `{ items: PublicRecord[], pagination: { total, page, limit } }` |
| `POST .../records`  | `{ data: PublicRecord, id }` (201)                      |
| `GET .../records/:id`| `{ data: PublicRecord }`                               |
| `PUT .../records/:id`| `{ data: PublicRecord }`                               |
| `DELETE .../records/:id`| `{ success: true }`                                 |
| `GET .../schema`    | `{ schema: JsonSchema }`                                |

`id` is duplicated at the top level of the `POST` response only, because the
user's table specifies it; it equals `data.id`.

**Why `content` nests the values** rather than spreading them next to `id`:
avoids key collisions (a recipe with its own `id`/`createdAt` field) and keeps
the envelope shape independent of user data. `schemaVersion` carries the stored
`schemaName` so a consumer knows which schema shape `content` follows. The list
endpoint uses `items` + `pagination` (rather than `data` + `total`) so the page
metadata has a clear home.

### 5. Persisting a public-created record

`POST` builds the internal record input:

```
{
  name: <`x-record-name` header if present, else `${schema.name} ${Date.now()}`>,
  collectionId: collection.id,
  schemaId: schema.id,
  schemaName: schema.name,
  values: <request body>,
}
```

then calls `createRecord("records", input)`. This keeps public records
indistinguishable from UI records in the form-filler's list (satisfies the spec's
"appears in the saved-records list" scenario). `PUT` calls `updateRecord` with
`{ values: <body> }` (plus refreshed `name`? no — keep the existing `name`), after
confirming the target record's `collectionId === collection.id` (else `404`, so an
id from another collection can't be reached).

**Why auto-generate `name`:** the internal `isRecordInput` guard and the
form-filler both require a non-empty `name`; the public payload is just the data.
`x-record-name` is an optional escape hatch, not required by the spec.

### 6. CORS via a shared helper

`lib/server/cors.ts` exports `CORS_HEADERS` and `preflight()` returning
`new Response(null, { status: 204, headers: CORS_HEADERS })`. Every `/api/v1`
handler spreads `CORS_HEADERS` into its response and exports an `OPTIONS` that
returns `preflight()`. Headers: `Access-Control-Allow-Origin: *`,
`Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`,
`Access-Control-Allow-Headers: Content-Type, x-workspace-id, x-schema, x-record-name`.

**Why `*`:** the prototype has no credentials/auth; the data is already
consumed by a public API by design.

## Risks / Trade-offs

- **Ajv rejects a schema the builder produced** (e.g. an unusual keyword combo)
  and 500s the request. Mitigation: `strict: false`; wrap `ajv.compile` in a
  try/catch that returns `422 { error: "Stored schema is not compilable" }`
  rather than throwing; a test compiles a representative builder output.
- **Ajv adds a dependency and some cold-start compile cost.** Mitigation: the
  per-schema compiled-validator cache amortizes it; `ajv` is a single, widely
  used, actively maintained package with no native bindings.
- **No auth on `/api/v1`** → anyone with a workspace id can read/write its
  records. Mitigation: acceptable for the current no-auth prototype (see `users`
  spec); API keys are an explicit follow-up. Workspace id is a UUID, not
  guessable/enumerable.
- **`name` auto-generation pollutes the UI list** with machine names like
  `Receta 1719…`. Mitigation: `x-record-name` header; a future proposal can make
  the form-filler tolerate unnamed records.
- **`total` counts the whole collection with a second full read** — fine at JSON
  file scale (the store is already fully read per request).
- **Case-sensitive `x-schema` name match** may surprise clients. Mitigation:
  documented in the spec ("by name first"); ids are the unambiguous key.

## Open Questions

- Should `PUT` on a non-existent id **create** the record (true REST upsert) or
  `404`? Design assumes `404` (matches the spec's "Replacing a missing record"
  scenario). Can be revisited without changing the approach.
