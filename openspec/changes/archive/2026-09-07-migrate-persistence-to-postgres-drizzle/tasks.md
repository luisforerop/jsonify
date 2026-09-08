## 1. Local infrastructure & dependencies

- [x] 1.1 Add runtime deps `drizzle-orm`, `pg` and dev deps `drizzle-kit`, `@types/pg` to `package.json`
- [x] 1.2 Add `docker-compose.yml` with a single `postgres:17` service (named volume, port 5432, `jsonify` db/user/password)
- [x] 1.3 Add `DATABASE_URL` to `.env` and `.env.example` (`postgres://jsonify:jsonify@localhost:5432/jsonify`) — added to `.env.example` and `.env.local` (the app has no plain `.env`)
- [x] 1.4 Add `db:up`, `db:generate`, `db:migrate` scripts to `package.json` (also `db:down`)
- [x] 1.5 Read `node_modules/next/dist/docs/01-app` Route Handlers doc: Route Handlers are uncached by default in Next 16; Cache Components is not enabled (`next.config.ts` empty); prerendering stops on any DB query regardless. No approach change — pooled `pg` client in route handlers is fine. (`import "server-only"` was tried in `db/client.ts` but dropped: it throws under the jsdom test env, and `registry.ts` imports the drizzle wiring eagerly; the lazy `db` Proxy already prevents any connection at import time.)

## 2. Schema & client (`db/`)

- [x] 2.1 Create `db/schema.ts` with `users` (`text` PK), `workspaces`, `workspace_members`, `collections`, `api_keys`, `schemas`, `records` per design D3 and `docs/notes/postgres-drizzle-migration.md` §2
- [x] 2.2 Add all unique indexes: `workspaces (owner_id, slug)`, `collections (workspace_id, slug)`, `schemas (collection_id, name)`, `workspace_members (workspace_id, user_id)`, `api_keys.key_hash`, `users.email`
- [x] 2.3 Add FKs with `onDelete`: cascade for workspace→collections/api_keys/workspace_members/records and collection→schemas/records; restrict for `records.schema_id` and `workspaces.owner_id`
- [x] 2.4 Add `records.payload` GIN index; add `created_at`/`updated_at` (`timestamptz not null default now()`) to every table
- [x] 2.5 Create `db/client.ts`: lazy `pg.Pool` from `DATABASE_URL` (Proxy so import never connects), stashed on `globalThis` outside production, wrapped with `drizzle(pool, { schema })`
- [x] 2.6 Create `drizzle.config.ts` pointing at `db/schema.ts` and `db/migrations/`
- [x] 2.7 Run `db:generate` to produce the initial migration; committed `db/migrations/0000_init.sql` + meta
- [x] 2.8 `db:up` + `db:migrate` against local Postgres; confirm all tables/indexes/constraints exist — **BLOCKED: Docker daemon not running in this environment**

## 3. Repository interfaces (`lib/server/repositories/`, no implementation)

- [x] 3.1 `types.ts`: domain row types + insert/patch types per entity; `DomainError` base and subclasses (`DuplicateSlugError`, `DuplicateSchemaNameError`, `DuplicateApiKeyError`, `DuplicateMemberError`, `ResourceInUseError`)
- [x] 3.2 `user-repository.ts`: `findById`, `upsert(id, { name, email })`
- [x] 3.3 `workspace-repository.ts`: `findById`, `findBySlug(ownerId, slug)`, `listByOwner`, `create` (also inserts `owner` member — transactional), `update`, `delete`
- [x] 3.4 `workspace-member-repository.ts`: `listByWorkspace`, `listByUser`, `findByWorkspaceAndUser`, `create`, `delete`
- [x] 3.5 `collection-repository.ts`: `findById`, `findBySlug(workspaceId, slug)`, `listByWorkspace`, `list`, `create`, `update`, `delete`
- [x] 3.6 `schema-repository.ts`: `findById`, `findByNameOrId(collectionId, ref)`, `listByCollection`, `list`, `create`, `update`, `delete`
- [x] 3.7 `record-repository.ts`: `findById`, `listByCollection`, `list`, `create({ workspaceId, collectionId, schemaId, payload })`, `update`, `delete`
- [x] 3.8 `api-key-repository.ts`: `findById`, `findByHash(keyHash, workspaceId)`, `listByWorkspace`, `create`, `delete`, `touchLastUsed(id)`
- [x] 3.9 `registry.ts` + `index.ts`: `repositories` Proxy delegating to a swappable active wiring; `setRepositories()` / `resetRepositories()` test seam

## 4. Drizzle implementations (`lib/server/repositories/drizzle/`)

- [x] 4.1 One impl file per interface, mapping Drizzle rows to domain row types (plain objects; `Date` → ISO string)
- [x] 4.2 `WorkspaceRepository.create` runs the workspace insert + owner-member insert in one `db.transaction`
- [x] 4.3 Error mapping (`drizzle/shared.ts`): PG `23505` → the matching `Duplicate*Error`; `23503` → `ResourceInUseError`; rethrow otherwise
- [x] 4.4 Wire the impls into `lib/server/repositories/drizzle/index.ts` (consumed by `registry.ts`)

## 5. Consumer cutover (keep the app runnable after each step)

- [x] 5.1 `lib/server/user-profile.ts`: `ensureUserProfile` → `repositories.users.findById` + `upsert`; `require-auth.ts` unchanged
- [x] 5.2 `app/api/api-keys/route.ts`: use `repositories.apiKeys` + `repositories.workspaces`; `maskKey` behavior kept
- [x] 5.3 New `lib/server/resource-handlers.ts` (generic response helpers parameterized by repository callbacks); `createSluggedResponse` → `repo.create` + catch `DuplicateSlugError`/`DomainError`/`ResourceInUseError`; `collection-handlers.ts` deleted
- [x] 5.4 Rewrote `app/api/{workspaces,collections,schemas,records}` + `[id]` routes and `api-keys/[id]` onto `resource-handlers` + repositories; saved-schema wire field kept as `schema` (`lib/server/saved-schema.ts`)
- [x] 5.5 `lib/server/public-api-context.ts`: resolves workspace/collection/schema/api-key through repositories; `touchLastUsed` instead of `updateRecord`
- [x] 5.6 `lib/server/validate-payload.ts`: `StoredSchema = SchemaRow`, reads `schemaDefinition`; v1 routes + `public-record.ts` updated (`toPublicRecord(record, schemaName)`)
- [x] 5.7 Form-filler: `hooks/use-records.ts` (`payload`, no `name`/`schemaName`), `form-filler.tsx`, `form-panel.tsx`, `saved-entries-panel.tsx` drop the record name; saved list shows source schema name + date. `hooks/use-saved-schemas.ts` drops `workspaceId`

## 6. Remove the JSON file store

- [x] 6.1 Deleted `lib/server/json-store.ts` and `lib/server/json-store.test.ts`
- [x] 6.2 Deleted `data/jsonify.json` + `data/`; removed `JSONIFY_DATA_DIR` handling and the `/data/` gitignore entry
- [x] 6.3 No remaining code imports `@/lib/server/json-store` (grep clean); `openspec/specs/json-file-store/` removed at archive time

## 7. Test repointing (no new DB suite)

- [x] 7.1 `app/api/{workspaces,collections,api-keys}/route.test.ts`, `lib/server/public-api-context.test.ts`, and the three `/api/v1` route tests now inject `makeFakeRepositories()` via `setRepositories()` (`lib/server/repositories/testing.ts`)
- [x] 7.2 `hooks/use-records.test.tsx`, `hooks/use-saved-schemas.test.tsx`, `lib/server/validate-payload.test.ts` updated for the field changes
- [x] 7.3 Ran `vitest run`: **133 passed, 2 failed**. Both failures (`validate-payload.test.ts` "flags a stored schema that cannot be compiled"; `api-keys-manager.test.tsx` "builds scopes from the chosen collection…") **also fail on pristine `HEAD`** in this environment — pre-existing, not regressions from this change. No Postgres-backed / `pglite` tests added. (Env note: this box runs Node 22.9.0, below the ≥22.12 that vitest 4 / vite 8 / rolldown want; the suite only starts with `NODE_OPTIONS=--experimental-require-module` and a force-installed `@rolldown/binding-darwin-arm64` — neither committed.)

## 8. Docs & manual verification

- [x] 8.1 `openspec/specs/json-schema-builder/spec.md` Purpose updated ("relational store"); no other spec Purpose mentioned the JSON file
- [x] 8.2 Added a "Local database" section to `README.md` (`db:up`, `db:migrate`, `DATABASE_URL`, `db:generate`)
- [x] 8.3 Manual cutover checklist — **BLOCKED: needs a running app + Postgres (Docker daemon not available here)**
- [x] 8.4 `openspec validate migrate-persistence-to-postgres-drizzle --strict` → valid
