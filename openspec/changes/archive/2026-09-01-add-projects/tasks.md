## 1. Projects persistence hook

- [x] 1.1 Create `hooks/use-projects.ts` mirroring `use-saved-schemas.ts`: `Project` (`id`, `name`, `createdAt`, `updatedAt`), `ProjectInput` (`name`), `jsonify.projects.v1` localStorage key, `{ projects, error, isLoaded, create, read, update, remove }`.
- [x] 1.2 Write `hooks/use-projects.test.tsx` covering create/read/update/remove and reload persistence, following the pattern in `use-saved-schemas.test.tsx`.

## 2. Scope saved schemas to a project

- [x] 2.1 Add `projectId: string` to `SavedSchema` and `SavedSchemaInput` in `hooks/use-saved-schemas.ts`; update `isSavedSchema` to require it.
- [x] 2.2 Change `useSavedSchemas` to accept an optional `projectId` argument: keep loading the full localStorage collection, but return `schemas` filtered to that project when provided (unfiltered when omitted); `create` stamps the input with the passed `projectId`.
- [x] 2.3 Update `hooks/use-saved-schemas.test.tsx` for the new `projectId` field and scoped vs. unscoped reads.

## 3. Project-scoped schema-builder

- [x] 3.1 Change `app/schema-builder.tsx` to accept a `projectId: string` prop and call `useSavedSchemas(projectId)`; pass `projectId` in every `create`/`update` call's input.
- [x] 3.2 Update `app/components/schema-builder/workspace-header.tsx`'s "Fill a form" link to point at `/projects/[projectId]/form-filler` using the active project id.

## 4. Project-scoped form-filler

- [x] 4.1 Change `app/form-filler.tsx` to accept a `projectId: string` prop and call `useSavedSchemas(projectId)` for the schema picker (the form-entries hook stays unscoped since entries resolve their project via `schemaId`).
- [x] 4.2 Update `app/components/form-filler/workspace-header.tsx` (or equivalent back-navigation) to link back to `/projects/[projectId]` using the active project id.

## 5. Projects UI

- [x] 5.1 Create `app/components/projects/projects-panel.tsx`: renders the saved-projects list with open/rename/delete actions, and an empty state when there are no projects.
- [x] 5.2 Create `app/components/projects/new-project-form.tsx` (or equivalent): name input plus create action, with a validation message when the name is empty.
- [x] 5.3 Create `app/projects.tsx` (client component): owns `useProjects()`, `useSavedSchemas()` (unscoped), and `useFormEntries()` (unscoped); renders the home screen; implements delete-project cascade (remove matching schemas, then matching entries, then the project itself) per design.md.
- [x] 5.4 Create `app/components/projects/workspace-panel.tsx` (or equivalent): the open-project view listing links into that project's schema-builder and form-filler.

## 6. Routing

- [x] 6.1 Replace `app/page.tsx` to render the new projects home screen (`app/projects.tsx`) instead of `SchemaBuilder`.
- [x] 6.2 Add `app/projects/[projectId]/page.tsx` rendering the project workspace view (task 5.4), reading `projectId` from route params.
- [x] 6.3 Add `app/projects/[projectId]/schema-builder/page.tsx` rendering `SchemaBuilder` with `projectId` from route params.
- [x] 6.4 Add `app/projects/[projectId]/form-filler/page.tsx` rendering `FormFiller` with `projectId` from route params.
- [x] 6.5 Remove the now-superseded `app/form-filler/page.tsx` and its route.

## 7. Verification

- [x] 7.1 Run the existing test suite (`vitest`) and confirm `use-saved-schemas`, `use-form-entries`, and the new `use-projects` tests pass.
- [x] 7.2 Manually walk the golden path in the browser: create a project, create a schema inside it, fill and save a form entry against that schema, confirm a second project does not see the first project's schemas, delete the first project, and confirm its schema and entry are gone.
