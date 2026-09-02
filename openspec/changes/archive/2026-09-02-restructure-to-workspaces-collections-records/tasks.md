## 1. Store & validation layer

- [x] 1.1 In `lib/server/json-store.ts`, change `Store` to `{ users, workspaces, collections, schemas, records }`, update `emptyStore()`, `coerceStore()`, and `CollectionName` accordingly
- [x] 1.2 Reset `data/jsonify.json` to the new empty shape (or delete it and let the store recreate it)
- [x] 1.3 In `lib/server/validation.ts`, add `isUserInput` (name, email, password all non-empty strings) and `isWorkspaceInput` (name non-empty, ownerId non-empty)
- [x] 1.4 In `lib/server/validation.ts`, replace `isProjectInput` with `isCollectionInput` (name non-empty, workspaceId non-empty, optional description string)
- [x] 1.5 In `lib/server/validation.ts`, replace `isFormEntryInput` with `isRecordInput` (name, collectionId, schemaId, schemaName non-empty; values is a record)
- [x] 1.6 Add a `slugify(name)` helper (lowercase, trim, collapse non-alphanumerics to `-`, strip leading/trailing `-`) in `lib/server/` and unit-test it
- [x] 1.7 Add server-side create handling for workspaces and collections that generates the slug and rejects a slug already used by the same owner (workspace) or in the same workspace (collection) with a 400
- [x] 1.8 Update `lib/server/json-store.test.ts` for the new collection names

## 2. API routes

- [x] 2.1 Add `app/api/users/route.ts` (GET list, POST create) and `app/api/users/[id]/route.ts` (PATCH, DELETE) wired to `isUserInput`
- [x] 2.2 Add `app/api/workspaces/route.ts` and `app/api/workspaces/[id]/route.ts` wired to `isWorkspaceInput` + slug generation/uniqueness
- [x] 2.3 Rename `app/api/projects/*` → `app/api/collections/*`, wire to `isCollectionInput` + slug generation/uniqueness
- [x] 2.4 Rename `app/api/form-entries/*` → `app/api/records/*`, wire to `isRecordInput`
- [x] 2.5 Update `app/api/schemas/*` to accept `workspaceId` + `collectionId` in place of `projectId`
- [x] 2.6 Update/rename `app/api/projects/route.test.ts` → `app/api/collections/route.test.ts` and add a workspaces route test covering slug uniqueness

## 3. Client hooks

- [x] 3.1 Add `hooks/use-users.ts` (`{ users, error, isLoaded, create, read }`, plus active-user helpers if not in context)
- [x] 3.2 Add `hooks/use-workspaces.ts` scoped to an `ownerId` argument (client-side filter, mirroring `useSavedSchemas(projectId)`)
- [x] 3.3 Rename `hooks/use-projects.ts` → `hooks/use-collections.ts`, `Project`→`Collection`, add `workspaceId`/`slug`/`description`, scope by `workspaceId` argument
- [x] 3.4 Rename `hooks/use-form-entries.ts` → `hooks/use-records.ts`, `FormEntry`→`SavedRecord` (avoids shadowing the TS `Record` utility), add `collectionId`, scope list by `collectionId` argument
- [x] 3.5 Update `hooks/use-saved-schemas.ts` to scope by `collectionId` (and carry `workspaceId`) instead of `projectId`
- [x] 3.6 Rename/update the hook tests (`use-projects.test.tsx` → `use-collections.test.tsx`, `use-form-entries.test.tsx` → `use-records.test.tsx`) and add `use-users` / `use-workspaces` tests using `installCollectionFetchStub`

## 4. Session context

- [x] 4.1 Add a `SessionContext` (React context) holding `{ currentUser, currentWorkspace, currentCollection }` and setters, provided in `app/layout.tsx`
- [x] 4.2 Add a hook that hydrates `currentWorkspace`/`currentCollection` from route slug params against the active user's workspaces/collections, returning a not-found state when unresolved (`hooks/use-scoped-collection.ts` + `ScopedGate`)

## 5. Onboarding UI

- [x] 5.1 Add `app/components/users/user-signup-form.tsx` (name, email, password) and `app/components/users/user-selector.tsx` (always-visible list + select), creating a user sets it active
- [x] 5.2 Add `app/components/workspaces/workspace-selector.tsx` (list the active user's workspaces + inline create); selecting sets it active and reveals the collection manager (inline on `/`, or via the `/w/<slug>` route)
- [x] 5.3 Replace `app/components/projects/*` with `app/components/collections/*` (`collections-panel`, `new-collection-form` with name + description, `collection-manager`, `collection-view`, `scoped-gate`), using the renamed hooks
- [x] 5.4 Rebuild the onboarding entry point. Split across pages (revised for UX): `/login` (user select/create) → `/` (dashboard) → `/workspaces` (workspace list + create) → `/w/<slug>` (collection manager). Guarded by `useRequireUser()`.

## 6. Routing

- [x] 6.1 Add `app/w/[workspaceSlug]/page.tsx` (collection manager for the workspace)
- [x] 6.2 Add `app/w/[workspaceSlug]/[collectionSlug]/page.tsx` (collection view linking to the two tools)
- [x] 6.3 Move schema-builder page to `app/w/[workspaceSlug]/[collectionSlug]/schema-builder/page.tsx`, resolving collection by slug and passing `collectionId`/`workspaceId` down
- [x] 6.4 Move form-filler page to `app/w/[workspaceSlug]/[collectionSlug]/form-filler/page.tsx`, same resolution
- [x] 6.5 Delete `app/projects/**`
- [x] 6.6 Update `app/components/shared/breadcrumb.tsx` to `Jsonify / <workspace> / <collection> / <view>` with slug-based links
- [x] 6.7 Add not-found handling for unknown workspace/collection slugs (or when no user is active on a scoped URL, show the user selector first) (`ScopedGate`)

## 7. Wire tools to collection scope

- [x] 7.1 Update `app/schema-builder.tsx` / `app/components/schema-builder/*` to save schemas with `collectionId` + `workspaceId` and list only the active collection's schemas
- [x] 7.2 Update `app/form-filler.tsx` / `app/components/form-filler/*` to load only the active collection's schemas, save records with `collectionId`, and list/isolate records by collection
- [x] 7.3 Update copy throughout (buttons, headings, empty states) from "project"/"form entry" to "collection"/"record"

## 8. Spec housekeeping & verification

- [x] 8.1 Edit `openspec/specs/json-schema-builder/spec.md` and `openspec/specs/schema-form-filler/spec.md` Purpose lines if they name "project" (they only say "project-local" = repo-local, left as-is); updated `openspec/specs/projects/spec.md` Purpose to describe collections under a workspace (direct edit, per OpenSpec Purpose rules)
- [x] 8.2 `npm run build` passes (tsc + route types clean). `npm run lint` has 5 pre-existing `react-hooks/set-state-in-effect` errors on the fetch-on-mount hooks (same pattern already on `main`); no new lint problems. Vitest suite not run this session at the user's request.
- [x] 8.3 Manually verify the acceptance flow from the source doc: create user `Carlos` → workspace `Clean Fuel` → collections `Recetas` and `Ingredientes` → build a schema → fill a form → record is saved under the collection
- [x] 8.4 Run `openspec validate restructure-to-workspaces-collections-records --strict`
