## Why

Projects, saved schemas, and form entries are persisted in browser `localStorage`, so the data is trapped in a single browser profile, invisible on disk, impossible to inspect or edit by hand, and lost when site data is cleared. Persisting to a JSON file inside the project makes the data durable, portable across browsers and machines, and directly viewable in the repo working tree.

## What Changes

- Add a server-side JSON file store at `data/jsonify.json` (single file, git-ignored) that holds `projects`, `schemas`, and `formEntries` collections.
- Add Next.js Route Handlers under `app/api/` exposing CRUD over each collection, backed by serialized reads/writes to the JSON file.
- Rewrite `useProjects`, `useSavedSchemas`, and `useFormEntries` to call the API via `fetch` instead of `window.localStorage`.
- **BREAKING**: the hook CRUD methods (`create`, `update`, `remove`, `read`) become asynchronous (return `Promise`). Callers in `app/projects.tsx`, `app/schema-builder.tsx`, and `app/form-filler.tsx` are updated to await them.
- Update the projects, schema-builder, and schema-form-filler specs where they mandate `localStorage` as the persistence mechanism.
- No automatic migration of existing `localStorage` data (out of scope — early-stage app, no production users).

## Capabilities

### New Capabilities
- `json-file-store`: A server-side persistence layer that stores projects, schemas, and form entries in a single project-local JSON file and exposes CRUD over HTTP Route Handlers, with serialized writes and tolerant handling of a missing or malformed file.

### Modified Capabilities
- `projects`: the "Manage projects through a persistence boundary" requirement no longer mandates `localStorage`; persistence is a project-local JSON file reached through an async hook, and data survives across browsers/machines rather than only across reloads in one profile.
- `schema-form-filler`: saved form entries persist to the project-local JSON file through an async hook rather than `localStorage`.
- `json-schema-builder`: saved schemas persist to the project-local JSON file through an async hook rather than `localStorage`.

## Impact

- Code: `hooks/use-projects.ts`, `hooks/use-saved-schemas.ts`, `hooks/use-form-entries.ts` and their tests; new `lib/server/json-store.ts`; new `app/api/projects/`, `app/api/schemas/`, `app/api/form-entries/` route handlers; consumers `app/projects.tsx`, `app/schema-builder.tsx`, `app/form-filler.tsx`.
- Runtime: persistence now requires the Next.js server process (filesystem access); the app no longer works as a purely static client. Assumes a single long-running server (e.g. `next dev` / `next start`), not a read-only serverless deployment.
- Repo: new git-ignored `data/` directory; `.gitignore` updated.
- Existing `localStorage` data is not carried over.
