## Why

All of Jsonify's data lives in a single server-side JSON file (`data/jsonify.json`)
guarded by an in-process write lock. That model has no referential integrity (a
deleted workspace orphans its collections, schemas, and records), enforces
uniqueness with app-level read-compare-write checks that are a race condition
under real concurrency, and does not scale past one process. Moving persistence to
Postgres (via Drizzle ORM, behind a repository boundary) gives the product real
constraints, cascade deletes, and a database it can run on a VPS.

## What Changes

- Add a Postgres + Drizzle persistence layer: `db/schema.ts` (table definitions),
  `db/client.ts` (a single `pg` `Pool`), `drizzle.config.ts`, versioned
  migrations under `db/migrations/`, and a local `docker-compose.yml` running
  Postgres.
- Define **decoupled TypeScript repository interfaces** in
  `lib/server/repositories/` (one per entity: users, workspaces, workspace
  members, collections, schemas, records, api keys) and a Drizzle-backed
  implementation of each. Route handlers, server actions, and the public-API
  context depend on the interfaces, never on Drizzle or `db` directly.
- Enforce in the database what the app checks by hand today: unique indexes
  (`workspaces (owner_id, slug)`, `collections (workspace_id, slug)`,
  `schemas (collection_id, name)`, `api_keys.key_hash`,
  `workspace_members (workspace_id, user_id)`) and foreign keys with explicit
  `ON DELETE` behavior (workspace → collections → schemas → records / api keys /
  members cascade; `records.schema_id` and `workspaces.owner_id` restrict).
- Add a `workspace_members` table and record the workspace creator as a member
  with the `owner` role when a workspace is created.
- Add a nullable `collections.description` column (kept from today's store) and an
  `schemas.is_active` flag; rename `schemas.schema` → `schema_definition` and
  `records.values` → `payload`; add a denormalized `records.workspace_id`; add a
  GIN index on `records.payload`.
- **BREAKING**: saved records no longer carry a user-given name. The
  "Identify saved records by name" behavior in `schema-form-filler` is removed;
  records are identified by their schema and creation date.
- **BREAKING**: `data/jsonify.json`, `lib/server/json-store.ts`, and the
  `json-file-store` capability are removed. No data-migration script — the
  current file is throwaway test data (cutover is a fresh empty schema).
- Repoint every consumer (`collection-handlers.ts`, `public-api-context.ts`,
  `user-profile.ts` / `require-auth.ts`, `api-keys/route.ts`,
  `validate-payload.ts`) at the repositories.
- No new database test suite (unit or integration) is written in this phase.

## Capabilities

### New Capabilities
- `relational-store`: A Postgres-backed persistence layer, reached through
  per-entity repository interfaces, that stores every Jsonify collection with
  database-enforced uniqueness and referential integrity (cascade / restrict on
  delete) and is schema-managed through versioned migrations.

### Modified Capabilities
- `json-file-store`: entire capability **removed** — persistence moves to
  `relational-store`; the single-JSON-file store, its HTTP CRUD contract, and its
  in-process write serialization no longer exist.
- `users`: the user profile is persisted in the relational store rather than the
  project-local JSON store; the "persistence backend unavailable" behavior now
  refers to the database being unreachable.
- `workspaces`: workspaces are persisted in the relational store; duplicate-slug
  rejection (still scoped per owner) is enforced atomically by a database unique
  index rather than an app-level check; creating a workspace also records the
  creator as an `owner` member.
- `projects`: collections are persisted in the relational store; deleting a
  collection removes its schemas and records by database cascade rather than by
  successive hook calls; duplicate-slug rejection within a workspace is enforced
  by a unique index.
- `schema-form-filler`: records are persisted in the relational store; the
  "Identify saved records by name" requirement is **removed** (records carry no
  user-given name).
- `json-schema-builder`: saved schemas are persisted in the relational store,
  with schema-name uniqueness per collection enforced by a unique index.

## Impact

- **Dependencies**: add `drizzle-orm`, `pg`; dev `drizzle-kit`, `@types/pg`.
- **New files**: `db/schema.ts`, `db/client.ts`, `drizzle.config.ts`,
  `db/migrations/*`, `docker-compose.yml`, `lib/server/repositories/*.ts` (+
  `lib/server/repositories/drizzle/*.ts`), `.env` gains `DATABASE_URL`.
- **Changed**: `lib/server/collection-handlers.ts`,
  `lib/server/public-api-context.ts`, `lib/server/user-profile.ts`,
  `lib/server/require-auth.ts`, `lib/server/validate-payload.ts` (reads
  `schemaDefinition`), `app/api/api-keys/route.ts`, and the saved-records UI in
  the form-filler (drops the record-name field).
- **Removed**: `lib/server/json-store.ts`, `lib/server/json-store.test.ts`,
  `data/jsonify.json`, `openspec/specs/json-file-store/`.
- **Tests**: hook/handler tests that stub the JSON store are repointed to stub
  the repository interfaces; no Postgres-backed test suite is added.
- **Runtime**: the app now requires a reachable Postgres (`DATABASE_URL`);
  intended to run under Docker / a VPS with `drizzle-orm/node-postgres` + `pg`.
- **Deferred (documented, not in this change)**: workspace invitations
  (`docs/notes/workspace-invitations.md`); account deletion / workspace
  ownership transfer (`docs/notes/account-deletion-ownership-transfer.md`).
