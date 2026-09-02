## Why

Jsonify is meant to grow into a multi-tenant SaaS, but today it only has a flat
list of "projects" with no notion of who owns them or which organization they
belong to. Before any auth, billing, or sharing work can happen, the domain
model needs the SaaS-shaped hierarchy: a user owns workspaces (tenants), and each
workspace holds collections of schemas and the records produced from them. This
change introduces that hierarchy and aligns the vocabulary (`project` →
`collection`, `form entry` → `record`) so later SaaS work builds on stable names.

## What Changes

- **BREAKING** Introduce a three-level hierarchy: **User → Workspace → Collection
  → (Schemas, Records)**. Every collection now belongs to a workspace; every
  workspace is owned by a user.
- **BREAKING** Rename the `project` concept to `collection` everywhere: the
  `projects` store collection becomes `collections`, `/api/projects` becomes
  `/api/collections`, routes move from `/projects/[projectId]` to slug-based
  `/w/[workspaceSlug]/[collectionSlug]`, and UI copy follows.
- **BREAKING** Rename `form entry` to `record`: the `formEntries` store
  collection becomes `records`, `/api/form-entries` becomes `/api/records`, and a
  record now carries a `collectionId` (it belongs to the collection, with its
  source schema referenced for form regeneration).
- Add **users**: a prototype user record (`name`, `email`, `password` stored in
  plain text / simple hash — no auth middleware, JWT, or cookies) created from a
  sign-up form. The active user is chosen from an always-visible selector rather
  than persisted in a session.
- Add **workspaces**: create and select workspaces owned by the active user,
  each with an auto-generated `slug` (e.g. "Clean Fuel" → `clean-fuel`).
  Collection creation requires an active workspace.
- Add slugs to collections (auto-generated from the name) and a `description`
  field.
- **BREAKING** No data migration: the existing `data/jsonify.json` store is
  reset to the new shape. Existing projects / schemas / form entries are
  discarded.

## Capabilities

### New Capabilities
- `users`: prototype user identity — sign-up form, user records in the store,
  and selection of the active user. Explicitly no authentication.
- `workspaces`: tenant layer — create/list/select workspaces owned by the active
  user, slug generation, and workspace-scoped navigation. An active workspace is
  required before collections can be created.

### Modified Capabilities
- `projects`: the capability is repurposed from "projects" to "collections" — a
  collection now belongs to a workspace (`workspaceId`), gains a `slug` and
  `description`, is created only when a workspace is active, and is reached
  through workspace-scoped slug routes instead of `/projects/[projectId]`.
- `schema-form-filler`: a saved entry is renamed to a **record**; a record
  belongs to a collection (`collectionId`) while still referencing its source
  schema; the saved-records list and its isolation are scoped by collection and
  workspace.
- `json-schema-builder`: saved schemas are scoped to a collection within a
  workspace (`workspaceId` + `collectionId`) instead of a bare `projectId`.
- `json-file-store`: the single JSON file now holds `users`, `workspaces`,
  `collections`, `schemas`, and `records` (replacing `projects` and
  `formEntries`); CRUD-over-HTTP is exposed for each of the five collections and
  payload validation follows the new shapes.

## Impact

- **Store**: `lib/server/json-store.ts` (`Store` type, `emptyStore`,
  `CollectionName`), `lib/server/validation.ts` (new input guards),
  `lib/server/collection-handlers.ts` (unchanged shape, new wiring).
  `data/jsonify.json` is reset.
- **API routes**: add `app/api/users/*`, `app/api/workspaces/*`; rename
  `app/api/projects/*` → `app/api/collections/*` and `app/api/form-entries/*` →
  `app/api/records/*`; schema payloads gain `workspaceId` / `collectionId`.
- **Hooks**: add `use-users`, `use-workspaces`; rename `use-projects` →
  `use-collections`; `use-saved-schemas` and `use-form-entries` (→
  `use-records`) gain workspace/collection scoping.
- **Routing / pages**: replace `app/projects/[projectId]/*` with
  `app/w/[workspaceSlug]/[collectionSlug]/*`; add an onboarding entry point
  (user selector → workspace selector → collection manager) at `/`.
- **Components**: `app/components/projects/*` → `app/components/collections/*`,
  new user/workspace onboarding components, `Breadcrumb` gains a workspace
  segment.
- **Tests**: `hooks/collection-fetch-stub.ts` reused for new hooks; existing
  hook/route tests renamed and updated.
- No new runtime dependencies; still the file-backed JSON store (no Drizzle/DB).
