## Context

Today `app/page.tsx` renders the schema-builder directly at `/`, and `/form-filler` renders the form-filler independently. Both read/write one flat, unscoped collection each through `hooks/use-saved-schemas.ts` and `hooks/use-form-entries.ts` (localStorage-backed, CRUD-shaped hooks). See proposal.md for why these need to become project-scoped.

## Goals / Non-Goals

**Goals:**
- Introduce a project as the top-level grouping for schemas (and, transitively, form entries).
- Keep every persistence concern behind a hook, so swapping localStorage for a database or API later is a hook-body change only, not a call-site change across components.
- Preserve the existing hook *shape* (`{ data, error, isLoaded, create, read, update, remove }`) for the new `use-projects` hook and for the scoped reads on `use-saved-schemas`, so the migration story stays uniform across all three hooks.

**Non-Goals:**
- No migration path for pre-existing unscoped localStorage data — the proposal confirms there are no real users/records yet, so `use-saved-schemas` and `use-form-entries` do not need to read or convert their old, unscoped storage keys.
- No sharing, multi-user, or permissions model for projects — a project is just a local grouping.
- No change to the internal shape of `JsonSchema` or `FormValues`, or to the schema-builder/form-filler's field-level behavior.

## Decisions

### Project identity lives on the schema, not the other way around
`SavedSchema` gains a required `projectId: string`. `use-saved-schemas` takes an *optional* `projectId` argument: the hook always loads the full localStorage collection, but the `schemas` it returns are filtered to that project when one is passed, and `create` stamps new schemas with it. Called with no argument, it exposes every schema across all projects. The schema-builder always calls it scoped (`useSavedSchemas(activeProjectId)`); the projects home screen calls it unscoped (`useSavedSchemas()`) so it can find and remove every schema belonging to a project being deleted, regardless of which project is "active". Alternative considered: a `use-projects` hook that embeds full schema objects inside each project record. Rejected because it duplicates the existing flat-collection-plus-id-reference pattern already used between form entries and schemas (`FormEntry.schemaId`), and would force a different persistence shape once a backend arrives (schemas as a first-class collection filterable by `projectId` maps directly onto a future `WHERE project_id = ?` query or API path).

### Form entries stay scoped indirectly, through their schema
`FormEntry` already carries `schemaId`. Because schemas are now project-scoped, an entry's project is always resolvable by following `schemaId → SavedSchema.projectId`. No `projectId` is added to `FormEntry` directly. Alternative considered: adding `projectId` to `FormEntry` for direct filtering. Rejected as redundant data that could drift from the owning schema's project; the form-filler already loads the active project's schema list before offering the picker, so entry scoping falls out of schema scoping for free (see MODIFIED requirement in `schema-form-filler`).

### Routing: project id in the URL path
New routes:
- `/` — projects home screen (list, create, rename, delete, open).
- `/projects/[projectId]` — project workspace: entry point that links into the two scoped views below.
- `/projects/[projectId]/schema-builder` — replaces the current `/` schema-builder.
- `/projects/[projectId]/form-filler` — replaces the current `/form-filler`.

`app/schema-builder.tsx` and `app/form-filler.tsx` (the client components) both take a `projectId: string` prop instead of reading nothing; the page components under `app/projects/[projectId]/...` read `params.projectId` and pass it down. This keeps the existing component/hook split intact — only the top of the tree changes. Alternative considered: a query string (`/schema-builder?project=...`) instead of a path segment. Rejected because the project is a hierarchical containment relationship (schemas belong to a project), which path segments express more directly than a query param, and it keeps deep links to a project's workspace bookmarkable and unambiguous.

### Cascade delete on project removal
Deleting a project also deletes its schemas (via `use-saved-schemas`) and, transitively, the form entries that reference those schemas (via `use-form-entries`). The home screen calls both hooks unscoped, filters schemas by the deleted project's id and entries by membership in that filtered schema-id set, then removes each match before removing the project itself. There is no cross-hook transaction, since all three hooks currently write to independent localStorage keys — this is a sequence of individual `remove` calls, not an atomic operation. Alternative considered: leaving orphaned schemas/entries around after project deletion. Rejected per the `projects` spec's "Delete a project and its associated data" requirement — data with no owning project is inaccessible through any UI path (the schema-builder and form-filler are project-scoped) and would just leak in storage.

### New `use-projects` hook mirrors the existing two hooks exactly
Same shape as `use-saved-schemas.ts`: `{ id, name, createdAt, updatedAt }` records in a `jsonify.projects.v1` localStorage key, with `create`/`read`/`update`/`remove`, an `isLoaded` flag, and an `error` string surfaced to the UI on storage failures. This is a deliberate copy of the established pattern rather than a shared generic — the codebase currently has two independent, near-identical hook implementations rather than a shared factory, and this change follows that precedent instead of introducing an abstraction the rest of the code doesn't use yet.

## Risks / Trade-offs

- **Three sequential localStorage writes on project delete, no atomicity** → acceptable for a client-only, single-tab localStorage store today; when hooks are backed by a real API, this orchestration should move behind a single server-side cascade-delete operation, but the call site (delete project → delete its schemas → delete their entries) stays the same shape.
- **`projectId` becomes a required field on `SavedSchema`** → any code path that constructs a `SavedSchema`/`SavedSchemaInput` outside the hook (none currently exist outside `use-saved-schemas.ts` and its test) would need updating; grep confirms the type is only constructed inside the hook and consumed as opaque data elsewhere.
- **Breaking the old project-independent `/` and `/form-filler` routes** → acceptable per proposal.md; no real data or external links depend on the old routes yet.
