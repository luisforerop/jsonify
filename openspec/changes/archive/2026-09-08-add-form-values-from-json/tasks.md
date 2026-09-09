## 1. Conforming function

- [x] 1.1 In `lib/schema-form.ts`, add a `FormValuesImportResult` type (`{ ok: true; values: FormValues }` | `{ ok: false; error: string }`).
- [x] 1.2 Add a private recursive `conformValue(field: FormField, raw: unknown): FormValue` per the design's coercion table: string coercion for string fields, finite-number / numeric-string → number for `number`/`integer` (else `""`), boolean only from real booleans, `null` always for `null` fields, recurse `conformValues` for objects, map items through `conformValue` for arrays, and fall back to `createInitialValue(field)` for absent/unusable input.
- [x] 1.3 Add `conformValues(fields: FormField[], raw: Record<string, unknown>): FormValues` that builds a shape-complete `FormValues` by reading each field's key from `raw` through `conformValue`, ignoring keys with no matching field.
- [x] 1.4 Add `formValuesFromJson(input: string, fields: FormField[]): FormValuesImportResult` that `JSON.parse`s the input, returns `{ ok: false }` with an "invalid JSON" message on parse failure, returns `{ ok: false }` with a distinct "JSON object required" message when the top-level value is not a plain object (array, string, number, boolean, null), and otherwise returns `{ ok: true, values: conformValues(fields, parsed) }`.

## 2. Conforming tests

- [x] 2.1 In `lib/schema-form.test.ts`, test scalar population with coercion: string field from a string, `age` integer field from `"42"` → number `42`, non-numeric string → `""`, boolean field from `true`/non-boolean.
- [x] 2.2 Test nested object population (`address.city`), and an object member that is missing or not an object falling back to initial values.
- [x] 2.3 Test array of scalars (`tags: ["a","b"]` → two items) and array of objects (`items: [{sku:"X1"},{sku:"X2"}]` → two conformed entries); a non-array member → `[]`.
- [x] 2.4 Test that unknown keys are dropped and that fields absent from the JSON keep their `createInitialValue` result.
- [x] 2.5 Test invalid JSON and each non-object top-level value (array, string, number, boolean, null) returning `{ ok: false }` with the expected message.

## 3. JSON import panel

- [x] 3.1 Create `app/components/form-filler/json-import-panel.tsx` (`"use client"`): a `builder-panel` with a heading ("Fill from JSON"), a hint that populating replaces all current form values, a textarea with a sample-object placeholder, a "Populate form" button disabled while the textarea is empty, and an inline error slot — mirroring `app/components/schema-builder/json-import-panel.tsx`.
- [x] 3.2 Props: `fields: FormField[]` and `onPopulated: (values: FormValues) => void`. On click call `formValuesFromJson(value, fields)`; on `ok: false` show `error`; on `ok: true` call `onPopulated(result.values)`.
- [x] 3.3 Style consistently with the existing form-filler / schema-builder panels (reuse `builder-panel`, `builder-heading`, `json-import-*`, `feedback-area` classes) on desktop and mobile.

## 4. Wire into the form filler

- [x] 4.1 In `app/form-filler.tsx`, add `mode: "form" | "import"` state to `FormFillerInner` defaulting to `"form"`.
- [x] 4.2 Add an `onEnterImport` prop to `FormPanel` and render a "Fill from JSON" button in the `FormPanel` heading, shown only when a schema is loaded and `fields.length > 0`.
- [x] 4.3 When `mode === "import"`, render `FormJsonImportPanel` (with `fields` and the `onPopulated` handler) in place of `FormPanel` in the workspace grid, keeping the schema-picker and saved-entries panels visible; include a way back to the form (a "Back to form" control).
- [x] 4.4 Implement `onPopulated(values)`: `setValues(values)`, `setActiveRecordId(null)`, `setMissingFields([])`, `setNotice("Form populated from JSON.")`, and `setMode("form")`.
- [x] 4.5 Ensure `loadSchema` / `loadRecord` / `startNewRecord` reset `mode` to `"form"` so switching schema while in import mode is coherent.
- [x] 4.6 Confirm the populated form submits through the existing `submit()` flow — a new record when `activeRecordId` is null — with no changes to `useRecords` or persistence.

## 6. Choose "Open in form" or "Publish record"

- [x] 6.1 Fix the "Fill from JSON" button visibility: it renders on the white `builder-panel` heading, so use `button button-outline` (not `button-secondary`, which is styled near-white for the dark topbar). Add a shared `.button:disabled` dim rule.
- [x] 6.2 In `FormJsonImportPanel`, replace the single "Populate form" button with two actions — "Publish record" (`button-add`) and "Open in form" (`button-outline`) — both disabled while the textarea is empty. Parse the textarea once, then dispatch the conformed values to the chosen callback; on `ok: false` show the error and dispatch nothing.
- [x] 6.3 Panel props become `fields`, `onOpenInForm(values)`, `onPublish(values)`, `onBack()`. Style "Back to form" as `button-outline` too.
- [x] 6.4 In `app/form-filler.tsx`, keep `openInFormFromJson(values)` as the non-committal handler (`setValues` / clear `activeRecordId` / `setMode("form")` / notice).
- [x] 6.5 Add `publishFromJson(values)` (async): set the values and return to the form, run `validateFormValues(fields, values)`; when invalid, set `missingFields` and a "complete the form to save" notice and persist nothing; when valid, `create({ collectionId, schemaId: activeSchemaId, payload: values })`, set `activeRecordId` to the saved id, and confirm with a notice.
- [x] 6.6 Wire both handlers into `<FormJsonImportPanel>` and confirm `create` / `useRecords` are unchanged.

## 5. Verification

- [x] 5.1 Read the relevant guide under `node_modules/next/dist/docs/` before touching the component if any Next.js API is involved; keep the generated `AGENTS.md` block committed with the work. (Read `01-app/01-getting-started/05-server-and-client-components.md`; no Next.js API touched — `FormJsonImportPanel` is a `"use client"` component with `useState`/handlers, imported into the already-client `form-filler.tsx` tree.)
- [x] 5.2 Run lint, type-check, and the test suite; confirm the new `lib/schema-form.test.ts` cases pass and no previously passing test regresses. (`vitest run`: 156/156 pass, incl. the 12 new `formValuesFromJson` tests. Lint/tsc: the only failures are pre-existing — `react-hooks/set-state-in-effect` in `hooks/*` and stale `.next/types` module errors — none in the changed files. Re-run after the section 6 changes.)
- [x] 5.3 Browser check: open the form filler, load a schema with a nested object, an array, and a required field. Switch to "Fill from JSON". (a) Paste a complete matching object (plus one unknown key, one omitted optional field), choose "Open in form", confirm coerced values + ignored key, submit, reload. (b) Paste a complete object and choose "Publish record" — confirm it saves without showing the form first and appears in the saved list after reload. (c) Paste an object missing a required field, choose "Publish record" — confirm nothing is saved and the form opens with the missing field flagged. Also confirm the "Fill from JSON" button is legible on the panel.
- [x] 5.4 Run `openspec validate add-form-values-from-json --strict` and fix any reported issues. (Valid, no issues; re-run after the section 6 changes.)
