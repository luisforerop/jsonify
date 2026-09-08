## REMOVED Requirements

### Requirement: Persist all collections in one project-local JSON file

**Reason**: Persistence moves to the `relational-store` capability (Postgres).
The single-file store is deleted along with `data/jsonify.json` and
`lib/server/json-store.ts`.
**Migration**: Domain data is now stored in Postgres and reached through the
per-entity repository interfaces in `lib/server/repositories/`. There is no
data-migration script — the JSON file held throwaway test data and cutover
starts from a fresh empty schema.

### Requirement: Tolerate a missing or malformed store file

**Reason**: There is no store file. Availability of persistence now depends on a
reachable database.
**Migration**: The database is provisioned by running the committed migrations
against it; an unreachable database surfaces an error rather than an empty store.

### Requirement: Serialize concurrent writes

**Reason**: The in-process write lock existed only because a single JSON file
cannot be written concurrently. Postgres handles concurrency directly.
**Migration**: Concurrency correctness is now provided by the database:
transactions and unique constraints (see `relational-store`).

### Requirement: Expose CRUD over HTTP for each collection

**Reason**: Generic per-collection CRUD is replaced by typed per-entity
repositories consumed by the existing feature routes.
**Migration**: Callers use `UserRepository`, `WorkspaceRepository`,
`CollectionRepository`, `SchemaRepository`, `RecordRepository`,
`ApiKeyRepository`, and `WorkspaceMemberRepository` instead of the generic
`CollectionName`-keyed store.

### Requirement: Reject invalid write payloads

**Reason**: Payload-shape validation is not tied to the JSON-file store and
continues at the route / application layer unchanged.
**Migration**: The same input guards run in the route handlers; JSON Schema
validation of record payloads (Ajv) is unchanged.
