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

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
