## Why

Today only signed-in workspace members can fill a schema's form, so collecting data from someone outside the workspace means giving them an account or an API key. Owners need to hand a single link to another person so they can submit a record against a schema, and to switch that link on and off at will.

## What Changes

- Add a per-schema "accepting responses" toggle (`sharingEnabled`, off by default) that workspace members can turn on and off from the schema/form-filler UI.
- Add a public, unauthenticated page `/f/<schemaId>` that renders the schema's form and lets the visitor submit it. The URL is keyed by the schema id.
- Add a public submit endpoint that validates the payload against the schema and stores it as a record in the schema's collection, only while the toggle is on.
- When the toggle is off (or the schema does not exist), the public page shows a "not accepting responses" state and the endpoint rejects submissions; no data is exposed or written.
- Add a "Share" control in the workspace UI to enable/disable the link and copy the URL.
- The public page exposes only the schema's form definition, never existing records.

## Capabilities

### New Capabilities
- `shared-form-links`: public shareable URL per schema, the on/off toggle controlling whether responses are accepted, and the public submission flow.

### Modified Capabilities
- `relational-store`: schemas gain a persisted `sharingEnabled` flag.

## Impact

- `db/schema.ts` + new migration: `schemas.sharing_enabled boolean not null default false`.
- Schema repository / `saved-schema.ts` / `/api/schemas/[id]`: read and update the flag.
- New routes: `app/f/[schemaId]/page.tsx`, `app/api/public/forms/[schemaId]/route.ts`.
- `proxy.ts`: `/f` and `/api/public` stay outside the protected matcher (already the case; covered by a test).
- `app/components/form-filler`: Share toggle + copy-link UI; a reusable form renderer is shared with the public page.
- Security: the schema id acts as the link capability, so submissions are validated with Ajv, size-limited, and never return other records.
