## 1. Server-side JSON file store

- [x] 1.1 Add `/data/` to `.gitignore`
- [x] 1.2 Create `lib/server/validation.ts` with input guards for project, saved-schema, and form-entry create/update payloads (adapted from the existing `isProject` / `isSavedSchema` / `isFormEntry` logic, without `id`/timestamps)
- [x] 1.3 Create `lib/server/json-store.ts`: resolve `data/jsonify.json` from `process.cwd()` (allow a base-path override for tests); `readStore()` returning an empty `{ projects, schemas, formEntries }` on ENOENT, parse failure, or shape mismatch; `writeStore()` with `mkdir -p`, temp-file write + atomic `rename`, 2-space indent + trailing newline
- [x] 1.4 Add the in-process write mutex (`withLock`) and generic `list` / `create` / `update` / `remove` collection helpers that assign `crypto.randomUUID()` ids and `createdAt`/`updatedAt` and run read-modify-write fully inside the lock
- [x] 1.5 Write `lib/server/json-store.test.ts` using a `fs.mkdtemp` base path: missing file, malformed file, create/update/remove happy paths, update/remove unknown id, and concurrent `Promise.all` writes both landing

## 2. Route handlers

- [x] 2.1 `app/api/projects/route.ts` — `GET` (list) and `POST` (create, `201`, `400` on invalid payload)
- [x] 2.2 `app/api/projects/[id]/route.ts` — `PATCH` (update, `404` unknown id, `400` invalid) and `DELETE` (`{ deleted: boolean }`)
- [x] 2.3 `app/api/schemas/route.ts` and `app/api/schemas/[id]/route.ts` — same pattern for saved schemas
- [x] 2.4 `app/api/form-entries/route.ts` and `app/api/form-entries/[id]/route.ts` — same pattern for form entries
- [x] 2.5 Add `export const dynamic = 'force-dynamic'` to the `GET` handlers; use `RouteContext<'/api/.../[id]'>` typing for the `[id]` handlers
- [x] 2.6 Add direct handler tests (call exported `GET`/`POST`/`PATCH`/`DELETE` with a `Request`, assert `Response` status and body) for at least the projects routes

## 3. Rewrite persistence hooks

- [x] 3.1 `hooks/use-projects.ts`: replace `localStorage` with `fetch('/api/projects')`; make `read` / `create` / `update` / `remove` async; keep the `{ projects, error, isLoaded, create, read, update, remove }` surface; set `error` on non-ok responses and network failures; drop the `setTimeout(0)` and call `read()` directly in the effect; remove client-side id/timestamp/parse logic
- [x] 3.2 `hooks/use-saved-schemas.ts`: same migration against `/api/schemas`; keep the client-side `projectId` filtering over the full fetched list
- [x] 3.3 `hooks/use-form-entries.ts`: same migration against `/api/form-entries`
- [x] 3.4 Rewrite `hooks/use-projects.test.tsx`, `hooks/use-saved-schemas.test.tsx`, `hooks/use-form-entries.test.tsx` to stub `global.fetch` with canned collection responses and assert request method/URL/body and resulting hook state (loaded list, error state, create/update/remove effects)

## 4. Update consumers

- [x] 4.1 `app/projects.tsx`: make `createProject`, rename, and `deleteProject` handlers async; `await` `create` / `update` / `remove`; run the child `removeSchema` / `removeEntry` deletes with `await` (or `Promise.all`) before `await remove(id)`; preserve existing return-value branching
- [x] 4.2 `app/schema-builder.tsx`: make the save and delete handlers async; `await` `create` / `update` / `remove`; keep the confirmation messaging
- [x] 4.3 `app/form-filler.tsx`: make the submit and delete handlers async; `await` `create` / `update` / `remove`; keep the confirmation messaging

## 5. Verification

- [x] 5.1 `npm test` passes (added `@/` alias to `vitest.config.ts` so route-handler tests resolve; hook tests reworked)
- [x] 5.2 `npm run lint` passes (kept the deferred `setTimeout(read, 0)` load in the hooks to satisfy `react-hooks/set-state-in-effect`)
- [x] 5.3 Smoke test: dev server restarted, `/projects/*` routes serve, `POST /api/projects` + `GET /api/projects` round-trip and `data/jsonify.json` reflects the created project
- [x] 5.4 `readStore()` returns an empty store on a missing or malformed file (covered by `lib/server/json-store.test.ts`); home screen loads as empty
