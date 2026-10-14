## 1. Persistence

- [x] 1.1 Add `sharingEnabled` (`sharing_enabled boolean not null default false`) to `schemas` in `db/schema.ts`
- [x] 1.2 Generate the Drizzle migration in `db/migrations` and confirm existing rows default to `false`
- [x] 1.3 Extend `SchemaRow` / `SchemaPatch` types, the Drizzle schema repository and the in-memory test repository to read and update `sharingEnabled`
- [x] 1.4 Add `sharingEnabled` to `SavedSchemaResponse` / `toSavedSchema` and the client `useSavedSchemas` type

## 2. Server endpoints

- [x] 2.1 Add `PATCH /api/schemas/[id]/sharing` (`{ enabled: boolean }`): require sign-in and workspace membership, 404 for unknown/inaccessible schema, 400 for invalid body
- [x] 2.2 Add `GET /api/public/forms/[schemaId]`: return `{ name, schema, accepting: true }` when sharing is on, `{ accepting: false }` when off, 404 for unknown or malformed id; never include records
- [x] 2.3 Add `POST /api/public/forms/[schemaId]`: enforce sharing on, JSON-object body, size cap, `validatePayload`; create the record with workspace/collection from the schema row; respond `201 { id }`
- [x] 2.4 Return `405` for other methods on the public endpoint
- [x] 2.5 Tests for 2.1–2.4 covering enabled, disabled, unknown id, invalid payload, oversized body, non-member toggle, and toggle-off-before-submit

## 3. Public page

- [x] 3.1 Extract the reusable form rendering/state from `app/form-filler.tsx` / `form-panel.tsx` so the public page can use it without workspace context
- [x] 3.2 Create `app/f/[schemaId]/page.tsx` with not-found, closed ("not accepting responses") and form states
- [x] 3.3 Implement the client `PublicForm`: client-side validation via `validateFormValues`, submit to the public endpoint, show server validation errors, show confirmation, handle "no longer accepting" on submit
- [x] 3.4 Add a test (or assertion) that `/f` and `/api/public` are not matched by the protected routes in `proxy.ts`

## 4. Workspace UI

- [x] 4.1 Add a Share control (switch, read-only URL, copy button) to the form-filler schema area, calling the sharing endpoint and updating local schema state
- [x] 4.2 Show a clear on/off state and disable the URL display while sharing is off

## 5. Specs and verification

- [x] 5.1 Run `openspec validate share-schema-form-url --strict`
- [x] 5.2 Manually verify end to end: enable, open the link logged out, submit, see the record in the table, disable, confirm the link closes
