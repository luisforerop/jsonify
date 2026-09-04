## Why

The public `/api/v1` API (`add-public-records-api`) has no authentication at
all: anyone who obtains a workspace id can list, create, replace, and delete
that workspace's records. To let workspaces expose some collections to
external consumers while keeping others private, and to let external and
internal integrations write data safely, Jsonify needs workspace-level API
keys that carry explicit CRUD permissions, plus a per-collection flag that
opts a collection into unauthenticated read access.

## What Changes

- Add workspace-scoped **API keys**: each key belongs to one workspace, has a
  display name, and carries an array of **scopes** such as `read:recetas`,
  `write:recetas`, `delete:recetas`, `read:*`, or `*` (full access). `write`
  covers both create (`POST`) and replace (`PUT`); `read` and `delete` map to
  `GET` and `DELETE`.
- Generate each key as a random secret shown to the user **once** at creation
  time; only its SHA-256 hash and a short display prefix are stored. Keys can
  be listed (masked) and revoked (deleted) but never re-displayed in full.
- Add an internal management surface (route + hook + UI) for creating,
  listing, and revoking a workspace's API keys, following the existing
  internal `/api/*` CRUD pattern (no server-side auth beyond workspace
  scoping, consistent with the rest of the prototype). Scopes are chosen from
  a collection × action picker (checkboxes), not typed by hand, so every
  generated scope is well-formed by construction.
- Add `isPublic` (boolean, default `false`) to **collections**, with a toggle
  on the collection's own page (alongside that page's existing rename/delete
  controls). A public collection allows unauthenticated `GET` requests
  against its records and schema through `/api/v1`.
- Add a per-collection, copyable **API request example** (curl and
  JavaScript `fetch`) on the collection's own page: the owner picks
  `read`/`write`/`delete` and gets a ready-to-use request against `/api/v1`
  for that collection, with an `<api-key>` placeholder standing in for a real
  secret.
- Enforce authorization on every `/api/v1` request: resolve the workspace and
  collection as today, then require a valid `Authorization: Bearer <key>`
  header for every write (`POST`, `PUT`, `DELETE`) and for reads on a
  collection that is not public. The presented key must belong to the
  resolved workspace and carry a scope covering the requested action and
  collection slug (or a matching wildcard); otherwise the request is rejected
  with no data change.
- **BREAKING**: `/api/v1` write endpoints, and reads on non-public
  collections, now reject requests that lack a valid, sufficiently-scoped API
  key (`401`/`403`) where they previously succeeded unauthenticated. Any
  existing integration must mint a key with the appropriate scopes.
- Extend the public API's CORS headers to allow the `Authorization` request
  header.

Non-goals: real user/session authentication (the prototype keeps its
client-side "active user" convention for internal routes, including managing
keys), key rotation/expiry policies, rate limiting, per-record (row-level)
permissions, and encrypting the JSON store at rest.

## Capabilities

### New Capabilities

- `api-key-management`: create, list, and revoke workspace-scoped API keys
  that carry an array of CRUD scopes (`<action>:<collectionSlug>` or
  `<action>:*`/`*`), with the secret shown only once at creation.

### Modified Capabilities

- `public-records-api`: `/api/v1` requests SHALL be authorized against an API
  key unless the request is a read against a collection flagged public; CORS
  headers SHALL additionally allow `Authorization`.
- `projects`: collections gain an `isPublic` flag, settable by the owner from
  the collection's own page, controlling unauthenticated read access to that
  collection's public API; that page also gains a copyable per-action API
  request example.

## Impact

- Store: new `apiKeys` collection in the JSON file store (`lib/server/json-store.ts`
  `Store` type); `collections` records gain an `isPublic` field.
- New server module `lib/server/api-keys.ts`: key generation, SHA-256
  hashing/verification, and scope-matching (`hasScope(scopes, action, slug)`).
- `lib/server/public-api-context.ts`: `resolvePublicContext` gains an `action`
  option and performs authorization (public-read bypass or API key + scope
  check) before schema resolution.
- New route `app/api/api-keys/` (`route.ts` for list/create, `[id]/route.ts`
  for revoke), mirroring the existing flat, workspace-scoped `/api/collections`
  pattern; list responses omit the key hash.
- New hook `hooks/use-api-keys.ts` and a workspace-level UI section
  (`app/components/workspaces/api-keys-manager.tsx`) to create, view
  (masked), and revoke keys; scopes are built from a collection × action
  picker (`app/components/workspaces/scope-picker.tsx`), not typed.
- The `isPublic` toggle, and the pre-existing rename/delete controls, moved
  from the workspace-level "Your collections" list onto the collection's own
  page (`app/components/collections/collection-view.tsx`); that page also
  gained a copyable curl/fetch request example per action
  (`app/components/collections/api-example.ts`,
  `api-example-panel.tsx`).
- `lib/server/validation.ts`: extend `CollectionInput`/`isCollectionInput` for
  `isPublic`; add `ApiKeyInput`/`isApiKeyInput`.
- `lib/server/cors.ts`: add `Authorization` to `Access-Control-Allow-Headers`.
- All three `app/api/v1/collections/[collectionSlug]/...` route files: pass
  the request's action to `resolvePublicContext` and handle the new
  `401`/`403` responses.
- No database migration: the JSON file store's existing "unknown field
  defaults to absent/empty" coercion means older store files keep working
  (`isPublic` reads as falsy, `apiKeys` reads as `[]`) without a migration
  script.
