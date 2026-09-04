## Context

See `proposal.md` — Why. Relevant current state:

- Everything lives in one JSON file behind `lib/server/json-store.ts`
  (`readStore`/`createRecord`/`updateRecord`/`removeRecord`, keyed by
  `CollectionName`). There is no database and, per the user's direction, this
  change does not introduce one — it adds a new `apiKeys` array to the same
  `Store` type and reads/writes it exactly like `workspaces`, `collections`,
  `schemas`, `records`.
- Internal `/api/*` routes (`collections`, `workspaces`, `schemas`, `records`)
  have **no server-side authorization at all**: `GET` returns every row across
  every workspace and the client (`hooks/use-*.ts`) filters by
  `workspaceId`/`ownerId` after the fetch (`hooks/use-collections.ts`,
  `hooks/use-workspaces.ts`). Scoping is a client-side convention, not a
  security boundary — consistent with the prototype's "active user" session
  (`app/session-context.tsx`, no persisted auth).
- `/api/v1` (`add-public-records-api`) resolves `{ workspace, collection,
  schema }` from `x-workspace-id` + the collection slug + `x-schema` in
  `lib/server/public-api-context.ts::resolvePublicContext`, then each route
  handler does its own thing. It currently has zero authentication (see that
  change's design.md, "No auth on `/api/v1`" risk) — this change closes that
  gap.
- Collections carry a `slug` unique per `workspaceId` and are created/updated
  through `createSluggedResponse`/`updateResponse` in
  `lib/server/collection-handlers.ts`, guarded by `isCollectionInput` in
  `lib/server/validation.ts`.
- The analysis the user supplied assumes Postgres + Drizzle
  (`pgTable`, `jsonb`, `uniqueIndex`). The data-shape ideas (an `isPublic`
  boolean on collections, a `scopes: string[]` on API keys, an
  `<action>:<target>` convention) transfer directly to the JSON store; the
  schema/migration/index machinery does not apply and is dropped.

## Goals / Non-Goals

**Goals:**

- Authorize every `/api/v1` request with one code path shared by all three
  route files, so no route can accidentally skip the check.
- Keep the internal `/api/*` management surface for API keys consistent with
  how every other entity (`collections`, `workspaces`, ...) is managed today,
  except where that pattern would leak a secret (see Decision 5).
- Make `isPublic` collections and scoped API keys additive to the JSON store:
  a store file written before this change keeps working with no migration
  step.

**Non-Goals:**

- Authenticating *who* manages a workspace's API keys or flips `isPublic` —
  the internal routes stay as unauthenticated as every other `/api/*` route
  today (see proposal's Non-goals: real user/session auth is out of scope).
- Rate limiting, key expiry/rotation, or audit logging of key usage beyond
  `lastUsedAt`.
- Row/record-level permissions — scopes are `action:collectionSlug`, not
  per-record.

## Decisions

### 1. Scope vocabulary: `read` / `write` / `delete`, not four CRUD verbs

A scope is one of `*`, `<action>:*`, or `<action>:<collectionSlug>`, where
`action` is `read`, `write`, or `delete`. `write` covers both `POST` (create)
and `PUT` (replace) — a caller that may create records in a collection may
also replace them, and splitting `create`/`update` into separate scopes adds
a second decision (which one does `PUT`-into-a-missing-id need?) without a
concrete use case yet. `read` covers `GET` (list, get-by-id, and the schema
endpoint); `delete` covers `DELETE`. This matches the analysis's "Convención
de Scopes Sugerida" (`read:*`, `write:recetas`, `delete:recetas`, `*`)
directly.

Format is validated at key-creation time with
`^(\*|(read|write|delete):(\*|[a-z0-9]+(-[a-z0-9]+)*))$` (the collection-slug
half mirrors `slugify`'s output). An invalid entry in the `scopes` array
rejects the whole create request with `400`.

**Alternative considered:** a `create`/`read`/`update`/`delete` (4-verb)
vocabulary matching CRUD literally. Rejected for the reason above; can be
introduced later as a superset without breaking existing `write:*` scopes if
a real need for separating create from update shows up.

### 2. Authorization folds into `resolvePublicContext`, not a separate step

`resolvePublicContext(request, collectionSlug, { schema, action })` gains a
required `action: "read" | "write" | "delete"` field alongside `schema`.
After resolving `workspace` and `collection` (unchanged: `x-workspace-id` →
workspace, slug → collection, both `400`/`404` exactly as today) and *before*
touching schemas, it authorizes:

1. `action === "read" && collection.isPublic` → skip straight to schema
   resolution (no key required).
2. Otherwise, read `Authorization: Bearer <key>`. Missing → `401` ("Missing
   API key"). Hash the presented key (SHA-256) and look it up in
   `store.apiKeys` where `keyHash` matches **and** `workspaceId ===
   workspace.id`. No match → `401` ("Invalid API key") — a key that hashes to
   a real row in a *different* workspace gets the same generic `401` as a
   key that doesn't exist anywhere, so the response never confirms a key's
   existence in another tenant.
3. The matched key's `scopes` must contain `*`, `` `${action}:*` ``, or
   `` `${action}:${collection.slug}` ``. No match → `403` ("API key missing
   required scope").
4. On success, best-effort touch `lastUsedAt` (fire-and-forget
   `updateRecord`, not awaited inline with the response) and continue to
   schema resolution exactly as today.

Every `/api/v1` route already calls `resolvePublicContext` first, so adding
`action` there means the three route files change by one field each
(`action: "read" | "write" | "delete"`), not by adding a parallel call.

**Why authorize before schema resolution:** schema resolution can return
`409`/`400`/`404` describing what schemas exist. Running it before
authorization would let an unauthenticated caller learn a collection's schema
names/count. Authorization must be the first thing that can fail after the
collection itself is resolved.

**Alternative considered:** derive the workspace from the API key instead of
`x-workspace-id`, dropping the header for authenticated calls. Rejected: it
would special-case the already-established `x-workspace-id` resolution
(`public-records-api`'s existing "Resolve the tenant" requirement) for
authenticated requests only, while unauthenticated public reads would still
need it — two different tenant-resolution paths for one route tree. Requiring
`x-workspace-id` unconditionally and checking `apiKey.workspaceId ===
workspace.id` is one path and one extra equality check.

### 3. Key format, hashing, and one-time display

A key is `` `jfy_${32 hex chars from crypto.randomBytes(16)}` ``. The store
keeps `keyHash` (SHA-256 hex digest of the full key) and `keyPrefix` (the
first 12 characters, e.g. `jfy_a1b2c3d4`, for display in the list UI). The
raw key is returned only in the `201` response body of the create call and is
never stored or re-derivable from `keyHash`.

**Why SHA-256, not bcrypt/scrypt:** unlike a user password, an API key is
generated with 128 bits of entropy the caller doesn't choose, so the threat
being defended against is "the JSON store file leaks," not "the hash is
brute-forced from a small keyspace" — a fast, collision-resistant hash used
for direct equality lookup is standard practice for API keys (GitHub,
Stripe). A slow KDF would only add lookup latency on every `/api/v1` request.

### 4. `isPublic` on `collections`, defaulted for existing rows

`CollectionInput` gains an optional `isPublic?: boolean`; `isCollectionInput`
accepts it when present. `json-store.ts`'s `coerceCollection` already drops
unknown/missing fields to `undefined` rather than throwing, so a collection
row written before this change simply reads `isPublic: undefined`, which is
falsy everywhere it's checked (`=== true` in the authorization check, and the
UI toggle defaults an absent value to unchecked) — no migration script needed.

The toggle's UI home moved during implementation: it started on the
workspace-level "Your collections" list (alongside that list's existing
rename/delete controls), then relocated to the collection's own page
(`app/components/collections/collection-view.tsx`), taking rename/delete
with it. Rationale in Decision 9 below — the net effect for this requirement
is unchanged (the owner can still toggle `isPublic` after creation without
touching other fields), only the screen it happens on moved.

### 5. API key management route breaks from the "GET returns everything" pattern

Every other internal list endpoint (`GET /api/collections`, `GET
/api/workspaces`, ...) returns the full store rows for the whole app and
lets hooks filter client-side (Context, "no server-side authorization at
all"). Doing that for `apiKeys` would ship every workspace's `keyHash` to
every browser tab, which is a real secret even though nothing else in this
prototype is. `GET /api/api-keys` therefore takes a required `workspaceId`
query param, filters server-side, and the list response mapper strips
`keyHash` (and the input `scopes`/`name`/`keyPrefix`/`lastUsedAt`/`createdAt`
remain). This is the one place this change intentionally departs from the
existing "unauthenticated, unfiltered, client-filters" convention, because
the cost of following it (broadcasting every key's hash) is unlike anything
else in the store.

`POST /api/api-keys` (`{ name, workspaceId, scopes }`) generates the key,
persists `{ name, workspaceId, keyHash, keyPrefix, scopes, lastUsedAt: null
}`, and returns `{ ...maskedRecord, key: <raw key> }` once. `DELETE
/api/api-keys/[id]` removes the row (revocation = deletion; there's no
`revokedAt` state to reason about).

### 6. CORS: add `Authorization`

`lib/server/cors.ts`'s `CORS_HEADERS["Access-Control-Allow-Headers"]` gains
`Authorization`. Nothing else in that module changes — `*` origin stays
appropriate (see the existing design.md's rationale); the API key, not
origin, is now the access control.

### 7. Scopes are chosen from a collection × action picker, not typed

The create-key form (`app/components/workspaces/scope-picker.tsx`) does not
ask the owner to type scope strings. It renders one row per workspace
collection plus an "All collections" row, each with `Read`/`Write (create &
update)`/`Delete` checkboxes, and derives the `scopes` array
(`scopesFromSelection`) from whatever is checked — a `read:*`/`write:<slug>`
string is never hand-typed, so it can't be malformed. The `Write` checkbox is
labeled "Write (create & update)" rather than plain "Write" because Decision
1's `write` = `POST` + `PUT` merger was not obvious from the word alone in
practice.

The existing-key list also stopped showing raw scope strings
(`write:recetas, read:*`) in favor of `summarizeScopes`, which groups a key's
scopes by target into readable lines (`"Recetas: Read, Write"`, `"Full access
to everything"` for a bare `*`), for the same "don't make the owner parse the
convention" reason.

**Alternative considered:** keep the free-text field the tasks originally
implied ("a create form (name + scope entry)") and validate server-side only.
Rejected after using it — a malformed scope silently rejects the whole create
request with a `400` and no indication of which entry was wrong, which is a
worse experience than making the invalid state unrepresentable in the UI.

### 8. Per-collection API request examples (curl/fetch), not per-key

Each collection's own page (`collection-view.tsx`) has an "API example"
toggle that reveals `ApiExamplePanel`
(`app/components/collections/api-example-panel.tsx`): the owner picks
`read`/`write`/`delete`, and gets a ready-to-copy `curl` or `fetch` snippet
for that action against that collection — `x-workspace-id` and
`Authorization: Bearer <api-key>` always present, `x-schema` and a JSON body
added for `write`. The literal placeholder `<api-key>` stands in for the
secret, since a collection page has no key in scope.

This started life on the API keys screen instead — first as a snippet shown
once alongside a freshly-created key's raw secret (real key, real example),
then also as a per-key "Try it" toggle using the `<api-key>` placeholder for
already-existing keys. Both were removed from that screen and consolidated
here, because "get a request example for collection X" is a collection-level
question the owner asks regardless of which key (if any) they're about to
use, and keeping it in one place (choose the action, not infer it from a
key's scopes) is simpler than the two divergent flows that existed before.
`app/components/collections/api-example.ts` holds the pure
action-to-request mapping (`requestForAction`) and the curl/fetch string
builders; nothing about it depends on `lib/server/api-keys.ts`.

### 9. Collection settings (`isPublic`, rename, delete) live on the collection's own page

These three controls started on the workspace-level "Your collections" list
(one row per collection, actions inline). They moved to the collection's own
page, in a row directly above the Schema builder / Form filler / API example
buttons, because a collection's settings and a collection's actions belong
next to each other, and the workspace list's job is to be a picker, not a
settings surface. The workspace list is now read-only (name + last-updated
date, linking into the collection).

`Delete` sitting immediately before the primary navigation buttons was a
deliberate placement per explicit instruction, weighed against the
misclick risk of a destructive action next to navigation; it ships as-is
because `.delete-button`'s coral color already sets it apart from the
primary/outline buttons beside it, and no confirmation step existed at the
previous location either, so this isn't a regression in safety — only a
change in adjacency.

Deleting a collection still cascades: `CollectionView` removes the
collection's records and schemas (via `useRecords(collection.id)` /
`useSavedSchemas(collection.id)`) before removing the collection itself, then
redirects to the workspace page — the same cascade `collection-manager.tsx`
used to perform, moved with the button.

## Risks / Trade-offs

- **A key leaked from browser history/logs grants full scoped access with no
  expiry.** Mitigation: out of scope for this change (see Non-Goals); keys
  are revocable by deletion, which is the mitigation available today.
- **`GET /api/api-keys` without `workspaceId` — reject or empty-list?**
  Rejected with `400`, mirroring `resolvePublicContext`'s "missing required
  identifier" pattern, rather than silently returning `[]`, so a caller that
  forgot the param notices immediately.
- **Breaking change for any current `/api/v1` consumer** (proposal, marked
  **BREAKING**). Mitigation: this is a prototype with no known external
  consumers yet; the change ships the API key management UI in the same
  release so a workspace owner can mint a key before/while updating callers.
- **Best-effort `lastUsedAt` write on every authorized request** adds a store
  write to read-heavy traffic. Mitigation: fire-and-forget (don't block the
  response on it); acceptable at JSON-file scale, matching how the rest of
  the store already does one full read per request.
