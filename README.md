This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Local database

Persistence is Postgres, reached through Drizzle ORM behind the repository
interfaces in `lib/server/repositories/`. For local development:

```bash
npm run db:up        # start Postgres via docker-compose
npm run db:migrate   # apply db/migrations to it
```

`DATABASE_URL` (in `.env.local`, see `.env.example`) points at that database —
`postgres://jsonify:jsonify@localhost:5432/jsonify` by default. After changing
`db/schema.ts`, run `npm run db:generate` to emit a new migration and commit it
(both `db/migrations/*.sql` and the `db/migrations/meta/` files — drizzle-kit
needs the `meta/` snapshot to diff the next change). There is no automatic data
migration from the old `data/jsonify.json` file store (it held throwaway data); a
fresh database starts empty.

`npm run db:migrate` (drizzle-kit) is for local use. Deploys run the standalone
`npm run db:deploy` instead — see [Deployment](#deployment).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Authentication

Sign-in, sign-up, and session management are handled by [Clerk](https://clerk.com).
Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
and `CLERK_SECRET_KEY` from your Clerk dashboard (or run `clerk init` to generate
a development instance for you).

`/workspaces` and `/w/*` pages, and every workspace/collection/schema/record/API
key management route under `/api/*` (excluding the public `/api/v1/*` API below),
require a signed-in session. `GET /api/workspaces` only returns the signed-in
user's own workspaces.

## Public API (`/api/v1`)

Once a collection has at least one saved schema, its records are reachable over a
versioned HTTP API. The workspace is identified by the `x-workspace-id` header;
the validating schema is identified by the `x-schema` header (schema name or id),
**required** on `POST`/`PUT` and optional on `GET .../schema`.

| Method | Route | Purpose | Response |
| ------ | ----- | ------- | -------- |
| `GET` | `/api/v1/collections/:slug/records?page=1&limit=20` | List records | `{ items: Record[], pagination: { total, page, limit } }` |
| `POST` | `/api/v1/collections/:slug/records` | Create a record (body = JSON values) | `201 { data: Record, id }` |
| `GET` | `/api/v1/collections/:slug/records/:id` | Get one record | `{ data: Record }` |
| `PUT` | `/api/v1/collections/:slug/records/:id` | Replace a record (full JSON body) | `{ data: Record }` |
| `DELETE` | `/api/v1/collections/:slug/records/:id` | Delete a record | `{ success: true }` |
| `GET` | `/api/v1/collections/:slug/schema` | Read the collection's JSON Schema | `{ schema }` |

A `Record` is `{ id, schemaVersion, content, createdAt, updatedAt }`, where
`content` holds the submitted values and `schemaVersion` is the validating
schema's name.

### Authorization

Every `/api/v1` request is authorized after the workspace and collection are
resolved. A `GET` (records, a record by id, or the schema) against a collection
whose `isPublic` flag is `true` needs no key. Every other request — reads on a
non-public collection, and every `POST`/`PUT`/`DELETE` regardless of
`isPublic` — requires an `Authorization: Bearer <key>` header carrying an API
key that belongs to the resolved workspace and whose scopes cover the request.

Mint keys from a workspace's API keys panel in the app. A key carries an array
of scopes, each one of `*` (everything), `<action>:*` (that action on every
collection), or `<action>:<collectionSlug>` (that action on one collection),
where `action` is `read` (`GET`), `write` (`POST`/`PUT`), or `delete`
(`DELETE`). The raw key is shown once, at creation time, and only its hash is
stored — treat it like a password.

```bash
curl -s -X POST http://localhost:3000/api/v1/collections/recetas/records \
  -H "x-workspace-id: <workspace-id>" \
  -H "x-schema: Receta" \
  -H "Authorization: Bearer <api-key>" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Arepa","porciones":4}'
```

Errors: missing `x-workspace-id` → `400`; unknown workspace or collection →
`404`; missing or unrecognized API key when one is required → `401`; a
recognized key lacking the required scope → `403`; missing `x-schema` on a
write → `400`; collection has no schema → `409`; payload fails schema
validation → `400 { error, details }`. All `/api/v1` responses carry
permissive CORS headers (including `Authorization` as an allowed request
header) and answer `OPTIONS` preflight requests.

```bash
curl -s http://localhost:3000/api/v1/collections/recetas/records \
  -H "x-workspace-id: <workspace-id>"
```

## Deployment

Deployed on a VPS via [Dokploy](https://dokploy.com) using its Nixpacks builder.

### Node version

Next.js 16 requires Node `>=20.9.0`. Nixpacks defaults to Node 18, so the repo
pins the runtime with `.nvmrc` (`22`) and `engines.node` in `package.json`. If
the builder still picks an old version, set `NIXPACKS_NODE_VERSION=22` in the
Dokploy app's environment.

### Environment variables

Set these in the Dokploy app's **Environment** tab (they are stored on your
server, not in the repo):

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | `postgres://user:password@host:5432/db`. User and password live in this string; there are no separate vars. For a Postgres created inside Dokploy, use its **internal** connection URL and keep both services in the same project. Runtime only — never inlined into the client bundle. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Needed at build time; public by design. |
| `CLERK_SECRET_KEY` | Runtime, server-only. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` etc. | Same routing values as `.env.example`. |

### Migrations

`npm run start` runs `node db/migrate.mjs` before `next start`, so schema
migrations are applied automatically on every container boot (idempotent — once
everything is applied it is a no-op).

`db/migrate.mjs` is a standalone runner that only uses `drizzle-orm` and `pg`
(both runtime dependencies); it does **not** need `drizzle-kit`, which is a
devDependency pruned from the production image. It reads `db/migrations/`
(ordered via `meta/_journal.json`) and tracks applied migrations in the
`drizzle.__drizzle_migrations` table inside the database itself, so what has and
hasn't run is per-database state — committing a migration never applies it
anywhere.

To run migrations manually instead (e.g. a one-off against production), call
`npm run db:deploy` with `DATABASE_URL` pointing at the target database from a
machine that can reach it, or override the Dokploy start command.

New migrations reach production the normal way: `npm run db:generate` locally →
commit `db/migrations/**` → deploy.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) — Next.js features and API.
- [Drizzle ORM — Migrations](https://orm.drizzle.team/docs/migrations)
