## Context

Forms are filled today only inside `/w/<workspace>/<collection>/form-filler`, behind Clerk (`proxy.ts` protects `/w` and `/workspaces`). Records are created via `repositories.records.create` and validated with Ajv through `validatePayload`. The `/api/v1` API already handles external writes but requires an API key. `schemas` belongs to a `collection`, which belongs to a `workspace`; a record stores `workspaceId`, `collectionId`, `schemaId`, `payload`. The form is generated client-side from the JSON Schema by `lib/schema-form.ts`.

## Goals / Non-Goals

**Goals:**
- A public page and write-only endpoint keyed by schema id, gated by a persisted per-schema toggle.
- Reuse the existing form generation, validation and record repository.

**Non-Goals:**
- Per-link tokens, expiry, response limits, captcha/rate limiting, or custom branding.
- Collecting respondent identity or editing a submitted response.
- Notifying owners of new responses.

## Decisions

1. **Toggle stored on `schemas` (`sharing_enabled boolean not null default false`)** rather than a separate `share_links` table or on `collections`. The user ties the link to the schema id and wants a single on/off; a column is the smallest model. Alternative: a `share_links` table with random tokens (revocable, rotatable) — deferred as a non-goal; can be added later without changing the URL shape for consumers.

2. **URL is `/f/<schemaId>`, using the existing uuid.** v4 uuids are unguessable enough for an "anyone with the link" model and match the request. Trade-off: the link cannot be rotated without recreating the schema (see Risks).

3. **Dedicated public endpoint `app/api/public/forms/[schemaId]/route.ts`** with `GET` (returns `{ name, schema, accepting }` only when sharing is on, else `{ accepting: false }`) and `POST` (validate + create record). Not reusing `/api/v1` because it is keyed by workspace header + slug + API key and would blur the public/private auth model. Other methods return `405`.

4. **Public page `app/f/[schemaId]/page.tsx` is a server component** that loads the schema via the repository and renders a client `PublicForm`, built from the same `deriveFormFields` / `FormPanel` pieces used by the form filler (extract the shared field rendering rather than duplicating). `/f` is not in the protected matcher in `proxy.ts`, so no Clerk change is needed; a test asserts this.

5. **Toggle endpoint `PATCH /api/schemas/[id]/sharing`** `{ enabled: boolean }` requiring `requireUserId()` and workspace membership (resolve schema → collection → workspace, as `/api/records` does), returning 404 for unknown or inaccessible schemas. The existing `PATCH /api/schemas/[id]` is left unchanged so a schema edit cannot flip the flag; `SavedSchemaResponse` gains `sharingEnabled`.

6. **Server-side enforcement on every submit.** The POST re-reads the schema row, checks `sharingEnabled`, enforces a JSON-object body and a body-size cap (e.g. 100 KB), validates with `validatePayload`, then creates the record with the schema's `workspaceId`/`collectionId` derived from the DB, never from the client. Response is `201 { id }` only.

7. **UI:** a "Share" control in the form-filler schema picker area: switch, read-only URL field, copy button. The URL is built from `window.location.origin`.

## Risks / Trade-offs

- [Anyone with the link can submit; spam] → Off by default, size cap, Ajv validation; rate limiting/captcha deferred and listed as a follow-up.
- [Link cannot be rotated] → Toggle off to stop collection; token-based links are a documented future option.
- [Schema edits while shared change what the form accepts] → Validation always uses the current stored schema; the open form is simply rejected with validation errors if stale.
- [Schema deletion with records is restricted by FK] → Unchanged; a deleted schema's link returns not found.
- [Migration on a live DB] → Additive column with default `false`; no backfill and no downtime.

## Migration Plan

Generate a Drizzle migration adding `schemas.sharing_enabled boolean not null default false` and run `db/migrate.mjs`. Rollback: drop the column (the public routes then 404/closed once code is reverted).
