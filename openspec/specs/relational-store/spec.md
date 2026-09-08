# Relational Store Specification

## Purpose

Provides durable, server-side persistence for every Jsonify entity in a
relational (Postgres) database, reached through per-entity repository interfaces,
with uniqueness and referential integrity enforced by the database rather than by
application-level checks.

## Requirements

### Requirement: Persist all domain data in a relational database

The system SHALL store the `users`, `workspaces`, `workspace_members`,
`collections`, `schemas`, `records`, and `api_keys` entities in a relational
database. Stored data SHALL survive a restart of the application process and
SHALL be visible to every request against that database regardless of which
browser or machine issued it. Each row SHALL carry a stable identifier and
`createdAt` / `updatedAt` timestamps; an update SHALL refresh `updatedAt` without
changing the identifier or `createdAt`.

#### Scenario: Data survives a restart

- **WHEN** rows exist in the database and the application process is stopped and started again
- **THEN** the previously stored rows are still returned by read operations

#### Scenario: Data is shared across clients

- **WHEN** one client creates a workspace, collection, schema, or record
- **THEN** another client reading the same database sees that row without any per-client import step

### Requirement: Access persistence through per-entity repository interfaces

The system SHALL expose persistence to route handlers, server actions, and the
public-API request context only through typed per-entity repository interfaces
(users, workspaces, workspace members, collections, schemas, records, api keys).
Callers SHALL NOT depend on the database engine, the ORM, or the table
definitions directly. Swapping the underlying database driver SHALL NOT require
changes outside the repository implementations.

#### Scenario: Caller depends on the interface, not the engine

- **WHEN** a route handler needs to read or write an entity
- **THEN** it does so through that entity's repository interface and contains no database- or ORM-specific code

### Requirement: Enforce uniqueness atomically

The database SHALL enforce these uniqueness constraints so that two concurrent
creates that would collide cannot both succeed:

- a workspace `slug` is unique among the workspaces owned by the same user;
- a collection `slug` is unique within its workspace;
- a schema `name` is unique within its collection;
- an API key hash is unique;
- a user has at most one membership row per workspace.

When a create violates one of these constraints, the system SHALL report a
conflict to the caller and SHALL NOT create a second conflicting row.

#### Scenario: Duplicate collection slug in the same workspace

- **WHEN** a collection is created whose slug matches an existing collection in the same workspace
- **THEN** the system reports the conflict and no second collection with that slug exists in that workspace

#### Scenario: Concurrent colliding creates

- **WHEN** two requests that would create rows with the same constrained key are processed at overlapping times
- **THEN** exactly one succeeds and the other is reported as a conflict

### Requirement: Enforce referential integrity on delete

The database SHALL enforce foreign keys with explicit delete behavior:

- deleting a workspace SHALL also delete its collections, schemas, records, API
  keys, and membership rows;
- deleting a collection SHALL also delete its schemas and records;
- a schema that still has records SHALL NOT be deletable;
- a user that still owns workspaces SHALL NOT be deletable.

#### Scenario: Delete a workspace

- **WHEN** a workspace with collections, schemas, records, API keys, and members is deleted
- **THEN** none of those child rows remain and no query returns them

#### Scenario: Delete a collection

- **WHEN** a collection with schemas and records is deleted
- **THEN** those schemas and records no longer exist

#### Scenario: Blocked delete of an owning user

- **WHEN** a delete is attempted for a user who still owns one or more workspaces
- **THEN** the delete is refused and the user and their workspaces are unchanged

### Requirement: Manage the database schema through versioned migrations

The system SHALL define its database schema as code and SHALL bring a database to
the current shape by applying an ordered set of committed migration files. The
schema SHALL NOT be changed by ad-hoc manual DDL or by pushing the in-code schema
straight to a database.

#### Scenario: Fresh database is brought up to date

- **WHEN** migrations are run against an empty database
- **THEN** every table, index, and constraint the application expects exists

#### Scenario: Schema change ships as a migration

- **WHEN** the in-code schema is changed
- **THEN** a new migration file is generated and committed alongside the change

### Requirement: Store user-defined JSON without a fixed relational shape

The system SHALL store user-authored JSON — schema definitions and record
payloads — as structured JSON values, not as fixed relational columns, and SHALL
keep validating record payloads against their schema in the application layer as
before. Record payloads SHALL be indexed so they can later be queried by their
content.

#### Scenario: Arbitrary payload shape is preserved

- **WHEN** a record is stored with a payload whose keys and nesting are defined only by the user's schema
- **THEN** reading the record back returns the same JSON structure

#### Scenario: Payload still validated by the application

- **WHEN** a record write arrives with a payload that does not satisfy its schema
- **THEN** the application rejects it before it is stored, exactly as it does today
