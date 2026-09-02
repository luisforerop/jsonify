## Context

See `proposal.md` — Why. Current state:

- Persistence is a single server-side JSON file (`data/jsonify.json`) with three
  collections: `projects`, `schemas`, `formEntries`. `lib/server/json-store.ts`
  owns the `Store` type, a write lock, and generic `list/create/update/remove`.
  `lib/server/collection-handlers.ts` turns those into HTTP responses;
  `lib/server/validation.ts` holds one type guard per collection.
- Each collection has a REST route pair (`app/api/<name>/route.ts` +
  `app/api/<name>/[id]/route.ts`) and a client hook (`hooks/use-*.ts`) that keeps
  an in-memory copy and does optimistic updates.
- Routing is id-based: `/` renders the projects panel, `/projects/[projectId]`
  renders the workspace, and `/projects/[projectId]/{schema-builder,form-filler}`
  the tools. `useSavedSchemas(projectId)` filters client-side by `projectId`;
  `useFormEntries()` returns everything and the UI filters by "schema belongs to
  active project".
- There is no user or tenant concept. Tests use
  `hooks/collection-fetch-stub.ts` (an in-memory fake of the route handlers) and
  `JSONIFY_DATA_DIR` to point the store at a temp dir.

Constraints: keep the file-backed JSON store (no database / ORM); no auth
middleware, JWT, or cookies; this is a pre-release prototype so breaking changes
and a wiped store are acceptable.

## Goals / Non-Goals

**Goals:**

- Establish the `User → Workspace → Collection → (Schemas, Records)` hierarchy in
  the store, the API, the hooks, and the routes.
- Keep the generic store/handler machinery; extend it by adding collections and
  guards, not by special-casing.
- Slug-based, workspace-scoped routing (`/w/<workspaceSlug>/<collectionSlug>/…`).
- Records belong to a collection and also reference their source schema.

**Non-Goals:**

- Authentication, authorization, password security, sessions, invitations,
  roles, billing — all later changes.
- Server-side enforcement of tenant isolation (the prototype filters client-side;
  the store still exposes every row through `GET /api/<collection>`).
- Migrating existing `data/jsonify.json` content.
- Renaming the `openspec/specs/projects/` directory on disk (the capability keeps
  its path; only its requirements change).

## Decisions

### 1. Extend the existing `Store` shape rather than introduce per-entity stores

`Store` becomes `{ users, workspaces, collections, schemas, records }`.
`emptyStore()`, `coerceStore()`, and `CollectionName` grow the two new names and
rename `projects`→`collections`, `formEntries`→`records`. Everything else in
`json-store.ts` is already generic over `CollectionName` and needs no change.

- **Alternative considered:** a dedicated module per entity. Rejected — the
  current generic layer already gives CRUD + locking + atomic writes for free;
  five near-identical modules would be pure duplication.

### 2. One route pair + one hook per collection, following the current pattern

Add `app/api/users/*`, `app/api/workspaces/*`, `app/api/collections/*`,
`app/api/records/*`; delete `app/api/projects/*` and `app/api/form-entries/*`.
Add `hooks/use-users.ts`, `hooks/use-workspaces.ts`; rename `use-projects.ts` →
`use-collections.ts`, `use-form-entries.ts` → `use-records.ts`. Hooks keep their
current shape (`{ items, error, isLoaded, create, read, update, remove }`).

- Client-side scoping stays the strategy: `useCollections(workspaceId)` and
  `useSavedSchemas(collectionId)` filter the full list; `useRecords(collectionId)`
  filters by `record.collectionId`. This matches `useSavedSchemas`'s existing
  `projectId` filter and keeps the server dumb.

### 3. Active user / workspace / collection live in React state, not persistence

Per the clarified requirement, nothing about "who is active" is persisted. A
single `SessionContext` (plain React context, no Zustand dependency) holds
`{ currentUser, currentWorkspace, currentCollection }` and setters. On reload the
context resets and the always-visible selector re-prompts.

- The workspace and collection are *also* derivable from the URL
  (`/w/<workspaceSlug>/<collectionSlug>`). The context is hydrated from the URL
  params on load of a scoped page: look up the workspace by slug among the active
  user's workspaces, then the collection by slug within it. If no user is active
  when a scoped URL is opened, the page shows the user selector first.
- **Alternative considered:** `localStorage` for `currentUserId`. Rejected by the
  user in favor of the always-visible selector; also avoids a stale-id class of
  bugs.
- **Alternative considered:** Zustand (named in the source doc). Rejected — one
  small context is enough and adds no dependency.

### 4. Slugs: generated, unique within their parent, immutable

`slugify(name)` = lowercase, trim, collapse every run of non-alphanumerics to a
single `-`, strip leading/trailing `-`. Uniqueness scope: workspace slug unique
per `ownerId`; collection slug unique per `workspaceId`. Creation rejects a
colliding slug with a 400 (the client surfaces "name already used"). Renaming a
workspace or collection does **not** change its slug (keeps URLs stable, avoids
cascade). Slug generation and the uniqueness check run server-side in the create
handler, so it needs a small per-collection "create validator" that can see
sibling rows — implemented by extending validation to optionally receive the
current collection contents, or by a dedicated handler for these two creates.

- **Alternative considered:** id-based routes (current pattern). Rejected by the
  user; slugs are wanted for the SaaS URL shape.
- **Alternative considered:** mutable slugs on rename. Rejected — breaks
  bookmarks and needs record/schema URLs to be recomputed.

### 5. Record data model

`Record = { id, name, collectionId, schemaId, schemaName, values, createdAt,
updatedAt }`. `collectionId` is the owning relationship (drives listing,
isolation, and cascade delete); `schemaId`/`schemaName` stay for form
regeneration and display. If the source schema is later deleted, the record
remains (its `values` and `schemaName` are still meaningful) but can no longer be
re-opened as a form — same behavior as today.

### 6. Cascade delete stays client-orchestrated

Deleting a collection: the collections view calls `remove` on each of that
collection's schemas and records through their hooks, then removes the
collection — mirroring today's "delete project → delete its schemas + entries".
Deleting a workspace is **out of scope** for this change (no requirement); only
create/list/select are specified for workspaces.

### 7. Routing surface

The onboarding flow is split across dedicated pages rather than one stacked
screen (revised after the first review for clearer UX):

```
/login                                    → choose or create a user; on select → replace(/)
/                                         → dashboard: greets the active user, shows workspace count, CTA → /workspaces
/workspaces                               → list of the user's workspaces + inline create; on select → push(/w/<slug>)
/w/[workspaceSlug]                        → collection manager for that workspace
/w/[workspaceSlug]/[collectionSlug]                 → collection view (links to the two tools)
/w/[workspaceSlug]/[collectionSlug]/schema-builder  → schema builder, scoped
/w/[workspaceSlug]/[collectionSlug]/form-filler     → form filler, scoped
```

`/` and `/workspaces` guard on an active user via `useRequireUser()` and
`replace(/login)` when there is none; scoped pages do the same through
`ScopedGate`. `app/projects/**` is deleted. `Breadcrumb` is
`Jsonify / Workspaces / <workspace> / <collection> / <view>`.

## Risks / Trade-offs

- **No server-side tenant isolation** → Acceptable for the prototype; every hook
  still downloads all rows and filters. Documented as a Non-Goal so the next
  change (auth) is expected to add real scoping to the API.
- **Passwords in plain text / weak hash** → Explicitly required by the source
  doc for the prototype. Mitigation: the sign-up requirement forbids treating
  this as real auth; a later change replaces it before any deployment.
- **Big blast radius (rename across store, API, hooks, routes, components,
  tests)** → Mitigation: land it as one change with the store + validation layer
  first, then API routes, then hooks, then pages, running the test suite at each
  layer; the generic store code is untouched so most churn is mechanical
  rename + new-file.
- **Slug collisions on common names** ("Recipes" in two workspaces is fine;
  twice in one workspace is not) → 400 + inline error on create; acceptable UX
  for now.
- **URL/state desync** (user opens a `/w/...` link for a workspace owned by a
  different user) → the workspace lookup is scoped to the active user's
  workspaces, so it resolves to a not-found state rather than leaking.
- **Stale scenario names in the `projects` and `schema-form-filler` deltas**
  (e.g. "Create a project with a name" now describes a collection) → OpenSpec
  matches scenarios by exact name and refuses renames inside MODIFIED blocks;
  the requirement-level names are correct and the scenario labels can be
  tidied in a follow-up doc pass after archive.

## Migration Plan

1. Reset `data/jsonify.json` to `{ users: [], workspaces: [], collections: [],
   schemas: [], records: [] }` (or delete it; the store recreates it).
2. Deploy is a single build — no phased rollout, no consumers besides this app.
3. Rollback = revert the commit and restore the old `data/jsonify.json` from git
   history if any throwaway data matters (it does not).

## Open Questions

- Visual/UX of the onboarding screen (single page with three stacked selectors
  vs. a step flow) — does not affect specs, store, or task breakdown; decide
  during implementation.
