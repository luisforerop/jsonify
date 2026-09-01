## Why

Schemas and form entries currently live in one flat, global collection each, with no way to group related work. As the number of saved schemas grows, users need a way to organize them by project so the schema-builder and form-filler only surface what's relevant to what they're currently working on.

## What Changes

- Add a **Projects** capability: a home screen where the user creates, lists, opens, renames, and deletes projects.
- Selecting a project opens a project workspace from which the user can jump into the schema-builder or form-filler scoped to that project.
- Saved schemas are now associated with the project they were created in. The schema-builder only shows and saves schemas for the active project.
- The form-filler's schema picker only lists schemas belonging to the active project.
- **BREAKING**: The schema-builder and form-filler are no longer reachable as project-independent views; both now require an active project context. No data migration is provided for existing localStorage entries (none exist yet in production use of this app).
- Persistence continues to follow the existing hooks pattern (`hooks/use-*.ts`) backed by localStorage, so swapping in a database or API later only requires replacing the hook implementations, not their call sites.

## Capabilities

### New Capabilities
- `projects`: Home screen and persistence for creating, listing, renaming, and deleting projects, and for entering a project's workspace.

### Modified Capabilities
- `json-schema-builder`: Saved schemas are now scoped to a project — the builder operates within an active project, listing and saving only that project's schemas.
- `schema-form-filler`: The schema picker only offers schemas belonging to the active project.

## Impact

- New hook `hooks/use-projects.ts` (localStorage-backed CRUD, following the same shape as `use-saved-schemas.ts` and `use-form-entries.ts`).
- `hooks/use-saved-schemas.ts`: saved schemas gain a `projectId`, and read/create operations are scoped by project.
- `app/page.tsx`: becomes the projects home screen instead of rendering the schema-builder directly.
- New routes for the project-scoped schema-builder and form-filler workspaces (replacing the current project-independent `/` and `/form-filler` entry points).
- New `app/components/projects/*` UI components, following the existing panel/header component structure used by the schema-builder and form-filler.
