## 1. Inference function

- [x] 1.1 In `lib/schema-builder.ts`, add a `JsonImportResult` type (`{ ok: true; properties: BuilderNode[] }` | `{ ok: false; error: string }`).
- [x] 1.2 Add a pure helper that infers a `JsonSchema` from a parsed JSON value: string→`string`, integral number→`integer`, non-integral number→`number`, boolean→`boolean`, `null`→`null`, array→`array` (items inferred from element 0, empty array→`{ type: "string" }`), object→`object` with recursively inferred `properties`.
- [x] 1.3 Add `schemaFromSampleJson(input: string, createId: () => string): JsonImportResult` that `JSON.parse`s the input, rejects parse failures with an "invalid JSON" message, rejects non-object top-level values with a "JSON object required" message, and otherwise returns `propertiesFromJsonSchema(inferredSchema, createId)`.

## 2. Inference tests

- [x] 2.1 Add tests in `lib/schema-builder.test.ts` for the flat object case (`{ test: "abc", numeros: 123 }` → `string` + `integer`).
- [x] 2.2 Add tests for number vs integer, nested objects, array of scalars, array of objects, empty array, and `null`-valued members.
- [x] 2.3 Add tests for invalid JSON and for each non-object top-level value (array, string, number, boolean, null) returning `{ ok: false }` with the expected message.

## 3. JSON import panel

- [x] 3.1 Create `app/components/schema-builder/json-import-panel.tsx`: a panel with a textarea, a "Generate schema" button, an inline error slot, and a note that generating replaces the current properties.
- [x] 3.2 On generate, call `schemaFromSampleJson`; on `ok: false` show the error and do nothing else; on `ok: true` invoke an `onGenerated(properties)` callback.
- [x] 3.3 Style the panel consistently with the existing schema-builder panels (reuse `panel-heading` / builder-panel styles) on desktop and mobile.

## 4. Wire into the schema builder

- [x] 4.1 In `app/schema-builder.tsx`, add `mode: "editor" | "import"` state defaulting to `"editor"`.
- [x] 4.2 Add a "From JSON" / "Back to editor" toggle in `WorkspaceHeader` (or the editor panel heading) that switches `mode`.
- [x] 4.3 In `import` mode render `JsonImportPanel` in place of `SchemaEditor`, keeping the saved-schemas and preview panels visible.
- [x] 4.4 On `onGenerated`, set `properties` to the inferred nodes, clear `validationErrors`, set a confirmation `notice`, and switch `mode` back to `"editor"`.
- [x] 4.5 Confirm the generated draft saves through the existing `saveSchema` flow (new schema when no `activeSchemaId`, update otherwise) with no code changes to persistence.

## 5. Verification

- [x] 5.1 Read the relevant guide under `node_modules/next/dist/docs/` before touching the route/component if any Next.js API is involved; keep the generated `AGENTS.md` block committed with the work. (No Next.js API touched — `JsonImportPanel` is a `"use client"` component with state/handlers per the server/client components guide, imported into the existing client tree.)
- [x] 5.2 Run lint, type-check, and the test suite. (`vitest run`: 145/145 pass, incl. the new inference tests. Two unrelated pre-existing failures were fixed along the way — a validator-cache key collision in `validate-payload.test.ts` and a missing `workspaceId` in `api-keys-manager.test.tsx`'s fetch stub. Pre-existing lint `set-state-in-effect` errors in `hooks/*` and stale `.next/types` tsc errors are untouched — not caused by this change.)
- [x] 5.3 Browser check: open the schema builder, switch to "From JSON", paste `{ "test": "abc", "numeros": 123, "address": { "city": "x" }, "tags": ["a"] }`, generate, confirm the editor shows the inferred properties and the preview matches, then save and reload.
