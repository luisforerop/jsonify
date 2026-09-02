## Context

See proposal.md - Why. Today all persistence lives in three client hooks
(`hooks/use-projects.ts`, `hooks/use-saved-schemas.ts`, `hooks/use-form-entries.ts`)
that read and write `window.localStorage` synchronously. Each hook has the same
shape: `parse` + `isX` type guard, `createXId()`, an `useEffect` that loads on
mount via a `setTimeout(read, 0)`, a `persist()` that writes the whole array, and
synchronous `create` / `update` / `remove` returning the record or a boolean.

Consumers (`app/projects.tsx`, `app/schema-builder.tsx`, `app/form-filler.tsx`)
call those methods synchronously in event handlers and branch on the return value
(`if (remove(id))`, `const project = create(...)`).

Runtime: Next.js 16 App Router, React 19, Vitest + Testing Library + jsdom. The
app is run with `next dev` / `next start` on a machine the user controls.

## Goals / Non-Goals

**Goals:**

- One JSON file inside the repo holding all three collections, editable by hand.
- Keep the three-hook persistence boundary; only its internals and the sync→async
  method signatures change.
- Server owns id and timestamp assignment (move that logic out of the client).
- Corrupt/missing file never breaks reads.
- Writes serialized so concurrent requests cannot corrupt the file.

**Non-Goals:**

- No migration of existing `localStorage` data.
- No multi-user auth, no per-request isolation, no optimistic concurrency tokens.
- No database, no external dependency.
- No support for read-only serverless deployment (filesystem is writable).
- No real-time sync/polling between open tabs beyond what a manual reload gives.

## Decisions

### D1: Single file at `data/jsonify.json`, git-ignored

Shape:

```json
{
  "projects": [],
  "schemas": [],
  "formEntries": []
}
```

- **Why single file:** the whole store is small, one file is trivial to inspect,
  diff, hand-edit, back up, and delete. Matches the user's request ("un archivo
  json").
- **Why `data/`:** conventional, keeps repo root clean, one line in `.gitignore`.
- **Why git-ignored:** it is user data, not source; it would cause noisy diffs and
  merge conflicts. `.gitignore` gets `/data/`.
- **Alternatives:** one file per collection (more files, no real benefit at this
  size); committing the file (rejected — user content); `.jsonify/` hidden dir
  (less discoverable).

### D2: Server-side store module `lib/server/json-store.ts`

A single module, imported only by route handlers, that:

- Resolves the file path from `process.cwd()` once.
- `readStore()`: `fs.readFile`; on `ENOENT` or `JSON.parse` failure or shape
  mismatch, returns a fresh empty store. Never throws for reads.
- `writeStore(store)`: `fs.mkdir(dir, { recursive: true })` then write.
- Write via **atomic replace**: write to `data/jsonify.json.tmp` then
  `fs.rename` over the target, so a crash mid-write cannot leave a truncated file.
- Format with `JSON.stringify(store, null, 2)` + trailing newline.
- Generic helpers `list(collection)`, `create(collection, record)`,
  `update(collection, id, patch)`, `remove(collection, id)` operating on the
  in-memory store, with id (`crypto.randomUUID()`) and `createdAt`/`updatedAt`
  assigned here.

### D3: In-process write mutex

All mutations run through a promise-chain mutex in the store module:

```ts
let queue: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}
```

Each mutating operation does `withLock(async () => { const s = await readStore(); ...; await writeStore(s); return result; })` — read-modify-write is fully inside the lock, so concurrent writes serialize instead of clobbering.

- **Why not a lockfile / OS advisory lock:** single server process assumption
  (Non-Goals); an in-process mutex is enough and has no cleanup hazards.
- **Trade-off:** if the user hand-edits the file while the server is running, the
  next write overwrites their edit. Acceptable for a local dev tool; documented.

### D4: Route handlers, one folder per collection

```
app/api/projects/route.ts          GET (list), POST (create)
app/api/projects/[id]/route.ts     PATCH (update), DELETE (remove)
app/api/schemas/route.ts           GET, POST
app/api/schemas/[id]/route.ts      PATCH, DELETE
app/api/form-entries/route.ts      GET, POST
app/api/form-entries/[id]/route.ts PATCH, DELETE
```

- Each handler validates the payload with a small hand-written guard (reuse the
  existing `isProject` / `isSavedSchema` / `isFormEntry` logic, adapted to
  validate *input* shape — i.e. without `id`/timestamps for create).
- Responses: `200` list/update, `201` create, `200` delete `{ deleted: true }`,
  `400` invalid payload, `404` unknown id, `500` unexpected.
- `GET` handlers are dynamic (filesystem read) — no caching config needed since
  Route Handlers are uncached by default; add `export const dynamic = 'force-dynamic'`
  defensively.
- Validation guards live in a shared `lib/server/validation.ts` (or colocated) so
  the hook-side types and server-side guards stay aligned.

### D5: Hooks call `fetch`, methods become async

Each hook keeps its public surface (`{ records, error, isLoaded, create, read,
update, remove }`) but:

- `read()` → `async`, does `fetch('/api/<collection>')`, sets state, sets
  `isLoaded`, sets `error` on non-ok / network failure.
- `useEffect` calls `read()` directly (drop the `setTimeout(0)` dance — it existed
  to defer `localStorage` access past hydration; a `fetch` in effect is already
  post-hydration).
- `create` / `update` → `async`, `POST` / `PATCH`, on success refetch or merge the
  returned record into state, return the record or `null`.
- `remove` → `async`, `DELETE`, returns `boolean`.
- `useSavedSchemas(projectId)` keeps client-side filtering by `projectId` over the
  full fetched list (server returns all; filter stays in the hook, unchanged).
- Id/timestamp generation and the `parse`/`isX` guards move server-side; hooks
  keep lightweight response typing.

### D6: Consumers `await` the mutations

Event handlers in the three page components become `async` and `await` the hook
calls. Existing branching (`if (await remove(id))`,
`const project = await create(...)`) is preserved. `app/projects.tsx`
`deleteProject` already loops `removeEntry` / `removeSchema` then `remove` — becomes
sequential `await`s (or `Promise.all` for the independent child deletes, then
`await remove`).

### D7: Tests

- Hook tests (`*.test.tsx`) currently drive `localStorage`. Rewrite to mock
  `global.fetch` (or use `vi.stubGlobal('fetch', ...)`) returning canned
  collection responses, and assert request method/URL/body + resulting state.
- Add `lib/server/json-store.test.ts`: temp dir via `fs.mkdtemp`, point the store
  at it (inject base path or `vi.stubEnv`/`process.chdir` in the test), cover
  missing file, malformed file, create/update/remove, and concurrent
  `Promise.all` writes landing both records.
- Route handler tests optional — can call the exported `GET`/`POST` functions
  directly with a `Request` and assert the `Response`.

## Risks / Trade-offs

- **Hand-edit lost on next write (D3)** → Document it; atomic write keeps the file
  always-valid; user can stop the server to edit safely.
- **Sync→async is a breaking API change for the hooks** → Contained: only three
  consumers, all in this repo, all updated in the same change. Spec deltas record
  the new async contract.
- **Filesystem-dependent runtime** → The app can no longer be deployed as a static
  export. Called out in proposal Impact; acceptable given the tool is local-first.
- **`process.cwd()` path resolution** → Fine under `next dev`/`next start` from the
  project root; would differ under some deploy setups, which are a Non-Goal.
- **Concurrent tabs see stale data until reload** → Same limitation `localStorage`
  effectively had; no regression. A future change could add polling or SSE.
- **No payload size / schema-depth limits** → Same as today; JSON Schemas are
  user-authored and small. Not addressed here.

## Migration Plan

1. Add `lib/server/json-store.ts` + validation, with tests.
2. Add the six route handler files.
3. Add `/data/` to `.gitignore`.
4. Rewrite the three hooks to `fetch`; update their tests.
5. Make the event handlers in the three page components `async`.
6. Manual smoke test: create/rename/delete a project, save/update/delete a schema,
   save/update/delete a form entry, reload, confirm `data/jsonify.json` contents.

No rollback tooling needed — revert the change and the hooks return to
`localStorage`. Any data written to `data/jsonify.json` stays on disk; pre-existing
`localStorage` data is untouched and would be read again after a revert.
