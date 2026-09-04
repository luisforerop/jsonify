## 1. Store & scope/key primitives

- [x] 1.1 Add `apiKeys: StoredRecord[]` to the `Store` type and `emptyStore()`/`coerceStore()` in `lib/server/json-store.ts` (mirroring the existing `workspaces`/`collections`/... fields).
- [x] 1.2 Create `lib/server/api-keys.ts`: `generateApiKey()` (returns `{ key, keyHash, keyPrefix }` using `crypto.randomBytes`/SHA-256), `hashApiKey(raw)`, `isValidScope(scope)` (the `*` / `<action>:*` / `<action>:<slug>` regex), and `hasScope(scopes, action, collectionSlug)`.
- [x] 1.3 Add unit tests for `hasScope` covering `*`, `read:*`, an exact `action:slug` match, a non-matching slug, and an insufficient action.
- [x] 1.4 Add unit tests for `isValidScope` covering the valid forms and rejecting malformed ones (e.g. `admin:recetas`, `read`, empty string).

## 2. API key input validation and internal management routes

- [x] 2.1 Add `ApiKeyInput`/`isApiKeyInput` to `lib/server/validation.ts` (`name`, `workspaceId`, `scopes: string[]`, each scope validated via `isValidScope`).
- [x] 2.2 Add `app/api/api-keys/route.ts`: `GET` requires a `workspaceId` query param (400 if missing), returns that workspace's keys with `keyHash` stripped; `POST` validates the body, generates the key via `lib/server/api-keys.ts`, persists `{ name, workspaceId, keyHash, keyPrefix, scopes, lastUsedAt: null }` through `createRecord("apiKeys", ...)`, and returns the masked record plus the raw `key` once, `201`.
- [x] 2.3 Add `app/api/api-keys/[id]/route.ts`: `DELETE` removes the key via `removeRecord("apiKeys", id)`, `404` when absent.
- [x] 2.4 Add route tests for list (workspace-scoped, no `keyHash` in response, 400 without `workspaceId`, isolation between two workspaces), create (valid scopes succeed and return the raw key once; invalid scope or missing name reject with 400), and delete (existing key removed, unknown id 404).

## 3. Collections gain `isPublic`

- [x] 3.1 Extend `CollectionInput`/`CollectionUpdate` and `isCollectionInput` in `lib/server/validation.ts` with optional `isPublic?: boolean`.
- [x] 3.2 Confirm/adjust `app/api/collections/route.ts` and `app/api/collections/[id]/route.ts` pass `isPublic` through `createSluggedResponse`/`updateResponse` unchanged (no route code should need new logic beyond the validator accepting the field).
- [x] 3.3 Add/extend tests in `app/api/collections/route.test.ts` covering: creating a collection without `isPublic` defaults it to falsy/absent, creating with `isPublic: true` persists it, and updating a collection's `isPublic` via `PATCH` changes only that field.

## 4. Authorize `/api/v1` requests

- [x] 4.1 In `lib/server/public-api-context.ts`, add `action: "read" | "write" | "delete"` to `resolvePublicContext`'s options and insert the authorization step (public-read bypass, else `Authorization: Bearer <key>` lookup scoped to the resolved workspace, else scope check) between collection resolution and schema resolution, per design.md Decision 2.
- [x] 4.2 On successful key authorization, fire-and-forget an update of that key's `lastUsedAt` (do not await it before responding).
- [x] 4.3 Update `app/api/v1/collections/[collectionSlug]/records/route.ts` (`GET` → `action: "read"`, `POST` → `action: "write"`), `app/api/v1/collections/[collectionSlug]/records/[id]/route.ts` (`GET` → `read`, `PUT` → `write`, `DELETE` → `delete`), and `app/api/v1/collections/[collectionSlug]/schema/route.ts` (`GET` → `read`) to pass the new `action` field.
- [x] 4.4 Add `Authorization` to `Access-Control-Allow-Headers` in `lib/server/cors.ts`.
- [x] 4.5 Add/extend tests (`public-api-context.test.ts` and the three `app/api/v1/.../route.test.ts` files) covering: public-collection `GET` succeeds with no key; private-collection `GET` without a key is `401`; any write without a key is `401` regardless of `isPublic`; a key with a matching scope succeeds; a key with an insufficient scope is `403`; a key valid for a different workspace is `401`; authorization failures return before the `409`/schema-related responses would.

## 5. Frontend: manage keys and toggle public collections

- [x] 5.1 Add `hooks/use-api-keys.ts` (`create`, `read(workspaceId)`, `remove`), modeled on `hooks/use-workspaces.ts`, that fetches from `/api/api-keys?workspaceId=...` and never stores a full secret beyond the just-created response.
- [x] 5.2 Add a workspace-scoped API keys UI (new component under `app/components/workspaces/` or `app/components/collections/`, wired into the workspace view): list existing keys (name, prefix, scopes, last used), a create form (name + scope entry), a one-time reveal of the new raw key with a copy affordance, and a revoke action per key.
- [x] 5.3 Add an `isPublic` toggle to the collection manager (`app/components/collections/collection-manager.tsx` and the relevant panel/detail component), calling `update()` from `hooks/use-collections.ts` with the new field.
- [x] 5.4 Add/extend component tests for the new API keys UI (create shows the secret once and hides it after leaving the view) and for the `isPublic` toggle round-tripping through `useCollections`.

## 6. Documentation

- [x] 6.1 Update `README.md`'s API section (if present) to document the `Authorization: Bearer <key>` header, the scope convention, and the `isPublic` behavior for `/api/v1`.

## 7. UX refinements (post-implementation, driven by usability feedback)

- [x] 7.1 Replace the free-text scopes field in 5.2 with a collection × action checkbox picker (`app/components/workspaces/scope-picker.tsx`, `scopesFromSelection`) so a submitted scope is always well-formed; label the `write` checkbox "Write (create & update)" to disambiguate Decision 1's `write` = `POST` + `PUT` merger.
- [x] 7.2 Show each existing key's granted permissions as readable "target: actions" lines (`summarizeScopes`) instead of raw scope strings, in the same panel from 5.2.
- [x] 7.3 Add a per-collection, copyable curl/fetch API request example (`app/components/collections/api-example.ts`, `api-example-panel.tsx`) reachable via an "API example" button next to Schema builder/Form filler on the collection's own page; the owner picks read/write/delete and the example (`<api-key>` placeholder, `x-workspace-id`, and for write an `x-schema` header + body) updates accordingly. Superseded two earlier iterations of this feature that lived on the API keys screen (a real-secret example shown once at key creation, and a per-existing-key "Try it" toggle) — both were removed in favor of this single collection-scoped version.
- [x] 7.4 Move the `isPublic` toggle from 5.3, plus the pre-existing rename/delete controls, from the workspace-level "Your collections" list (`collections-panel.tsx`) onto the collection's own page (`collection-view.tsx`), in a row above the Schema builder/Form filler/API example buttons; `collection-manager.tsx` and `collections-panel.tsx` lost the now-unused rename/delete/toggle plumbing, and the workspace list became read-only (name + link).
- [x] 7.5 Add/extend tests for 7.1–7.4: `scope-picker.test.ts` (`summarizeScopes`), `api-key-example.test.ts` → replaced by `app/components/collections/api-example.test.ts` + `api-example-panel.test.tsx` after 7.3's relocation, and `api-keys-manager.test.tsx` trimmed back to what still lives on that screen.
