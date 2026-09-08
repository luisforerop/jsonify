## Context

See `proposal.md` — Why. Reference `docs/notes/postgres-drizzle-migration.md` for
the full exploration and the strict table spec; this document only records the
design-level decisions.

Current persistence: `lib/server/json-store.ts` reads/writes one file
(`data/jsonify.json`) with six flat collections behind an in-process promise
mutex (`withLock`). Two consumer shapes exist:

- `lib/server/collection-handlers.ts` — generic `CollectionName`-keyed
  `listResponse` / `createResponse` / `updateResponse` / `deleteResponse` /
  `createSluggedResponse`, used by `app/api/{workspaces,collections,api-keys}`
  and the schema/record routes.
- `lib/server/public-api-context.ts` — `/api/v1/**` resolves its own
  `{ workspace, collection, schema }` from headers + API key, reading the store
  directly.

Runtime: Next.js 16 App Router, React 19, Vitest 4. Clerk provides identity
(`lib/server/require-auth.ts`, `lib/server/user-profile.ts`). Deployment target
for this migration is Docker / a VPS with a reachable Postgres.

## Goals / Non-Goals

**Goals:**

- One decoupling boundary: per-entity repository interfaces that consumers depend
  on; a single Drizzle implementation behind them.
- Database-enforced uniqueness and referential integrity (replace the app-level
  slug checks and the missing cascades).
- Versioned, committed migrations; reproducible from an empty database.
- A local `docker-compose` Postgres and a documented `DATABASE_URL`.
- Delete `json-store` and its file once every consumer is repointed.

**Non-Goals (design-level, beyond the proposal's scope list):**

- No repository method for cross-entity transactions beyond what a single
  `delete` cascade needs — services compose repositories, and the one multi-step
  flow here (create workspace + owner member) runs in one transaction helper.
- No query-builder surface leaking through the interfaces (no `where` clauses as
  parameters) — each interface exposes named finders.
- No connection pooling tuning beyond a single `pg.Pool` with defaults.
- No seed script beyond what `docker-compose` + migrations provide.

## Decisions

### D1: `db/` holds schema + client; repositories live under `lib/server/`

```
db/
  schema.ts        Drizzle table definitions (§2 of the migration note)
  client.ts        pg Pool + drizzle() instance
  migrations/      generated SQL + drizzle journal (committed)
drizzle.config.ts  points drizzle-kit at db/schema.ts and db/migrations
lib/server/repositories/
  types.ts                 shared row/insert types, DomainError kinds
  user-repository.ts        interface + factory
  workspace-repository.ts
  workspace-member-repository.ts
  collection-repository.ts
  schema-repository.ts
  record-repository.ts
  api-key-repository.ts
  index.ts                 wires the Drizzle impls, exports singletons
  drizzle/                  one impl file per interface
```

- **Why `db/` at repo root:** matches the strict spec (`db/schema.ts`) and the
  drizzle-kit convention; keeps ORM wiring out of `lib/server` which stays
  "our code".
- **Why interfaces + factory, not classes consumers `new`:** consumers import a
  ready singleton from `lib/server/repositories`; tests import the interface type
  and pass a fake. No DI container.
- **Alternative rejected:** repositories inside `db/` — couples our domain
  boundary to the ORM folder; the whole point is that `lib/server` code never
  imports `drizzle-orm`.

### D2: Driver — `drizzle-orm/node-postgres` + a single pooled `pg.Client`

`db/client.ts` creates one `pg.Pool` from `process.env.DATABASE_URL` and wraps it
with `drizzle()`. The pool is stashed on `globalThis` in development so Next's
hot reload does not open a new pool per edit.

```ts
const g = globalThis as { __jsonifyPool?: Pool };
export const pool = g.__jsonifyPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") g.__jsonifyPool = pool;
export const db = drizzle(pool, { schema });
```

- **Why `node-postgres` not `postgres.js` / serverless:** target is Docker/VPS
  with a standard TCP Postgres; `pg` is the reference driver. Swapping to
  `@neondatabase/serverless` later touches only this file (D1 keeps consumers
  clear of it).
- **Why global pool in dev:** known Next App Router hot-reload issue; without it,
  connections leak until the DB refuses new ones.

### D3: Tables exactly as `docs/notes/postgres-drizzle-migration.md` §2

7 tables: `users`, `workspaces`, `workspace_members`, `collections`, `api_keys`,
`schemas`, `records`. Key points that differ from today's store:

- `users.id` is `text` PK (Clerk id); everything else is `uuid` PK
  `defaultRandom()`.
- Unique indexes: `workspaces (owner_id, slug)`, `collections (workspace_id,
  slug)`, `schemas (collection_id, name)`, `api_keys.key_hash`,
  `workspace_members (workspace_id, user_id)`, `users.email`.
- FK `onDelete`: `cascade` for workspace→(collections, api_keys,
  workspace_members) and collection→(schemas, records) and workspace→records;
  `restrict` for `records.schema_id` and `workspaces.owner_id`.
- Renames: `schemas.schema` → `schema_definition` (jsonb); `records.values` →
  `payload` (jsonb, GIN index). New: `schemas.is_active` (bool, default true),
  `records.workspace_id` (denormalized FK). `records` has **no** `name` /
  `schema_name` (see D7). `collections.description` kept as nullable text.
- Every table gets `created_at` / `updated_at` `timestamptz not null default
  now()`; the repository sets `updated_at = now()` on update.

Column names `snake_case` in Postgres, camelCase Drizzle properties.

### D4: Repository interface shape

Each interface exposes named async methods returning domain row types (plain
objects, not Drizzle model instances). Illustrative:

```ts
interface CollectionRepository {
  findById(id: string): Promise<Collection | null>;
  findBySlug(workspaceId: string, slug: string): Promise<Collection | null>;
  listByWorkspace(workspaceId: string): Promise<Collection[]>;
  create(input: NewCollection): Promise<Collection>;      // throws DuplicateSlugError
  update(id: string, patch: CollectionPatch): Promise<Collection | null>;
  delete(id: string): Promise<boolean>;                   // DB cascades children
}
```

- `WorkspaceRepository.create` runs in a transaction that also inserts the
  `owner` membership row.
- `ApiKeyRepository`: `findByHash(keyHash, workspaceId)`, `touchLastUsed(id)`.
- `SchemaRepository`: `listByCollection`, `findByNameOrId(collectionId, ref)`
  (covers `public-api-context`'s `x-schema` name-or-id lookup).
- `RecordRepository.create` takes `workspaceId`, `collectionId`, `schemaId`,
  `payload`.

### D5: Constraint violations → typed domain errors

The Drizzle impl catches Postgres error code `23505` (unique_violation) and
throws a `DomainError` subclass (`DuplicateSlugError`, `DuplicateSchemaNameError`,
`DuplicateApiKeyError`, `DuplicateMemberError`) carrying the conflicting field.
Route handlers map those to the existing HTTP responses ("That name is already
taken here", `400`). `23503` (foreign_key_violation) on a `restrict` delete →
`ResourceInUseError` → `409`. Everything else rethrows.

- **Why catch at the impl, not the route:** keeps PG error codes out of the rest
  of the app; the interface contract is "throws `DuplicateSlugError`", engine-
  agnostic.

### D6: Consumer cutover

- `collection-handlers.ts`: the generic `CollectionName` handlers are replaced by
  thin per-entity handlers (or a small generic wrapper parameterized by a
  repository). `createSluggedResponse`'s list-compare-insert becomes
  `repo.create(...)` + catch `DuplicateSlugError`.
- `public-api-context.ts`: header/API-key resolution stays; the three store reads
  become `workspaceRepo.findById` / `collectionRepo.findBySlug` /
  `schemaRepo.*` / `apiKeyRepo.findByHash` + `touchLastUsed`.
- `user-profile.ts`: `ensureUserProfile` → `userRepo.upsert(id, { name, email })`.
- `api-keys/route.ts`: `apiKeyRepo.create` / `listByWorkspace` /
  `workspaceRepo.findById`.
- `validate-payload.ts`: read `storedSchema.schemaDefinition` instead of
  `storedSchema.schema`. `StoredSchema` type moves to repository row types.
- Form-filler UI: drop the record-name input and the saved-records name column
  (D7).

### D7: `records` has no name

Per the strict table spec and the product decision, records carry no user-given
name. The `schema-form-filler` spec's "Name a record for later identification"
requirement is removed. The saved-records list identifies a record by its source
schema name (via `schema_id`) and `created_at`. `hooks/use-form-entries.ts` and
the form-filler component drop the `name` field and its "name required"
validation.

### D8: Tests — repoint, don't rebuild

- Delete `lib/server/json-store.test.ts`.
- Tests that stub `json-store` (`api-keys.test.ts`, route tests,
  `public-api-context.test.ts`, hook tests) switch to passing fake repository
  objects (hand-written, in-memory) to the handler/context functions. This
  requires the handlers/context to accept their repositories as arguments (or
  read them from a module-level object that tests can override with
  `vi.mock`) — a small seam already implied by D1.
- **No** Postgres-backed test suite, `pglite`, or transaction-rollback harness in
  this phase (explicit non-goal). The unique-index / cascade behavior in the
  `relational-store` spec is verified manually during cutover.

### D9: Local infra

`docker-compose.yml` with one `postgres:17` service, a named volume, port 5432,
and a `jsonify` database. `.env` / `.env.example` gains
`DATABASE_URL=postgres://jsonify:jsonify@localhost:5432/jsonify`. `package.json`
scripts: `db:up` (compose up -d), `db:generate` (drizzle-kit generate),
`db:migrate` (drizzle-kit migrate). App startup does not auto-migrate in dev; the
developer runs `db:migrate` (a task documents this).

## Risks / Trade-offs

- **Hot-reload connection leak** → global pool stash (D2); documented.
- **Handlers need a testing seam for repositories** → introduce the seam as part
  of the cutover (D8); it is a net improvement in decoupling, not scope creep.
- **No automated coverage of the new constraint behavior** → accepted non-goal;
  mitigated by a manual cutover checklist in tasks (create colliding slugs,
  delete a workspace and confirm children gone).
- **`records.workspace_id` denormalized** → must be set consistently on create
  and can drift if a record is ever re-parented (no such flow today);
  `RecordRepository` is the only writer, so the invariant is local.
- **Two-write "create workspace + owner member"** → wrapped in a transaction in
  `WorkspaceRepository.create`; a failure rolls back both.
- **Dropping record names is user-visible** → BREAKING, called out in the
  proposal and the `schema-form-filler` spec delta; test data only, no real
  users.
- **Next 16 route-handler / caching specifics** → confirm against
  `node_modules/next/dist/docs/01-app` during implementation (a task);
  Route Handlers are uncached by default, `export const dynamic` already used in
  `api-keys/route.ts`.

## Migration Plan

1. Add deps; add `docker-compose.yml`, `.env.example`, `db:*` scripts.
2. `db/schema.ts` + `db/client.ts` + `drizzle.config.ts`; generate the initial
   migration; `db:up` + `db:migrate` against local Postgres.
3. Repository interfaces + shared types (`lib/server/repositories/*.ts`), no impl.
4. Drizzle implementations (`lib/server/repositories/drizzle/*.ts`) + error
   mapping (D5); wire singletons in `lib/server/repositories/index.ts`.
5. Cut over consumers one file at a time (D6), keeping the app runnable after
   each: `user-profile` → `api-keys` route → `collection-handlers` →
   `public-api-context` → `validate-payload` → form-filler UI.
6. Delete `lib/server/json-store.ts`, `lib/server/json-store.test.ts`,
   `data/jsonify.json`; remove `/data/` handling and `JSONIFY_DATA_DIR`.
7. Update the affected specs' main files' Purpose lines where they still say
   "project-local JSON file" (json-schema-builder, and any others archive
   flags).
8. Manual cutover checklist (see tasks): CRUD each entity, colliding slugs,
   workspace delete cascade, public API record create/list, reload persistence.

**Rollback:** revert the change; `json-store.ts` and its file return. Any data
written to Postgres stays in the container volume but is unused after revert.

## Open Questions

- Exact `role` vocabulary for `workspace_members` beyond `owner` / `member`
  (e.g. `admin`) — does not affect the schema (`text` column) or these specs; can
  be settled when member-management UI is designed.
- Whether `schemas.is_active` should gate schema resolution in
  `public-api-context` now or stay an unused flag until a later change — leaning
  unused-for-now; does not change the table.
