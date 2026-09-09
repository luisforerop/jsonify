## Context

See proposal.md — Why. The form filler (`app/form-filler.tsx`, `FormFillerInner`)
holds its working state as `fields: FormField[]` and `values: FormValues` in React
state, plus `activeSchemaId`, `activeRecordId`, `missingFields`, and `notice`.
`fields` is derived from a saved schema by `deriveFormFields(schema)` in
`lib/schema-form.ts`; `values` is seeded by `createInitialValues(fields)` and
mutated through the pure helpers `setValueAtPath` / `addArrayItem` /
`removeArrayItem`. `createInitialValue(field)` already defines the canonical empty
value per field type (`""` for strings and numbers, `false` for boolean, `null`
for null, `{}`/`[]` for object/array). Submit reads `values` straight into the
record `payload`.

The scalar inputs in `app/components/form-filler/field-editor.tsx` store a number
field as a JS `number` (or `""` while empty), a string field as a JS `string`, a
boolean as `boolean` — so populated values must use those same representations to
round-trip through the existing editors and validation.

The schema builder already shipped the sibling feature "generate a schema from a
sample JSON" (`schemaFromSampleJson` in `lib/schema-builder.ts`,
`app/components/schema-builder/json-import-panel.tsx`, a `mode` toggle in
`app/schema-builder.tsx`). This design mirrors that structure so the two import
flows stay recognisably the same.

## Goals / Non-Goals

**Goals:**
- Produce a `FormValues` object from a pasted JSON string that is conformed to a
  given `FormField[]` — every value in the right representation, ready to hand
  straight to `setValues`.
- Keep the conforming logic a pure, separately tested function with no React or
  DOM dependency, symmetric with `schemaFromSampleJson`.
- Make the import a reversible mode inside the existing form-filler view, not a
  new route, matching the schema builder's `mode` toggle.

**Non-Goals:**
- No schema selection from inside the import panel — the schema must already be
  loaded; the toggle is simply unavailable otherwise.
- No *new* validation logic — "Publish record" reuses the existing
  `validateFormValues`; "Open in form" defers validation to the normal submit as
  before.
- No merge/patch semantics — either action replaces the whole `values` object. No
  "fill only empty fields" mode.
- No partial publish — "Publish record" either creates a complete record or drops
  the user into the form to finish; it never saves a record with missing required
  fields.
- No format/${date}/coercion cleverness beyond primitive type coercion (e.g. no
  parsing `"2026-01-01"` into anything special, no trimming, no enum snapping).
- No file upload; a paste-in textarea only.

## Decisions

### A pure `formValuesFromJson(input, fields)` in `lib/schema-form.ts`

Signature:

```ts
type FormValuesImportResult =
  | { ok: true; values: FormValues }
  | { ok: false; error: string };

function formValuesFromJson(
  input: string,
  fields: FormField[],
): FormValuesImportResult;
```

It `JSON.parse`s `input` (parse failure → `{ ok: false, error: <invalid JSON> }`),
rejects a top-level value that is not a plain object
(`{ ok: false, error: <object required> }`, distinct message), then walks `fields`
and builds the result by pulling each field's key out of the parsed object.

A private recursive `conformValue(field, raw)` does the per-field work and is
reused for object properties and array items:

| field type        | `raw` present                                              | `raw` absent / unusable        |
| ----------------- | --------------------------------------------------------- | ------------------------------ |
| `string`          | `typeof raw === "string"` → `raw`; number/boolean → `String(raw)`; else initial | `""` |
| `integer`/`number`| finite number → `raw`; numeric string → `Number(raw)`; else `""` | `""` |
| `boolean`         | `Boolean(raw)` when `raw` is a boolean; else initial `false` | `false` |
| `null`            | always `null`                                             | `null` |
| `object`          | recurse `conformValues(field.properties, raw)` when `raw` is a plain object; else initial | `createInitialValues(field.properties)` |
| `array`           | `raw.map(el => conformValue(field.items, el))` when `raw` is an array; else `[]` | `[]` |

"Absent" means the key is missing OR `raw` is `undefined`/`null` (except for a
`null`-typed field, which always yields `null`). Every branch falls back to
`createInitialValue(field)` so the output is always shape-complete and identical
to what `createInitialValues` would have produced for untouched fields.

Keys in the parsed object with no matching field are never read, so they are
dropped for free.

Alternative considered: reuse the record `payload` as-is (`setValues(parsed)`)
with no conforming. Rejected — unconformed values (a string `"42"` in a number
field, a missing nested object, an extra key) break the field editors and the
submit payload; the schema is exactly the information needed to fix them.

Alternative considered: build the conform step from the JSON Schema
(`savedSchema.schema`) rather than `FormField[]`. Rejected — `FormField[]` is
already the derived, normalized view the form renders from; `deriveFormFields`
runs once in `loadSchema` and the panel already has `fields` in scope.

### Number fields: keep `""` for non-numbers

`createInitialValue` uses `""` for an empty number field and the number input
renders `""` as blank, so a non-numeric or missing value conforms to `""` rather
than `0` — inventing a `0` the user never typed would be worse than an obviously
empty field, and `validateFormValues` treats `""` as missing for required fields.

### UI: a `mode` toggle inside the form-filler view

`FormFillerInner` gains `mode: "form" | "import"` state defaulting to `"form"`.
The form panel column shows a "Fill from JSON" button when `mode === "form"` and a
schema is loaded (`fields.length > 0`); in `mode === "import"` the `FormPanel` is
replaced by a new `FormJsonImportPanel`
(`app/components/form-filler/json-import-panel.tsx`) — a textarea, an inline error
slot, a "Back to form" control, a note that this replaces all current values, and
two action buttons. The schema-picker and saved-entries columns stay visible.

This matches the schema builder's toggle (`app/schema-builder.tsx`
`mode: "editor" | "import"`), so the component and wiring mirror the existing
`JsonImportPanel` path.

Alternative considered: a fourth grid column always showing the import textarea.
Rejected — the form-filler grid is already three columns and the schema builder
set the toggle precedent.

### Two exit actions: "Open in form" and "Publish record"

The panel parses the textarea once (`formValuesFromJson(value, fields)`), then
hands the conformed `FormValues` to whichever action the user clicked. The panel
stays a thin dispatcher — the two `FormFillerInner` handlers hold all the state
and persistence logic:

- `onOpenInForm(values)` → `setValues(values)`, `setActiveRecordId(null)`,
  `setMissingFields([])`, `setMode("form")`, notice `"Form populated from JSON."`.
  Non-committal; the exact shape of the old single-button behavior.
- `onPublish(values)` (async) → the same `setValues` / `setActiveRecordId(null)` /
  `setMode("form")`, then reuse `validateFormValues(fields, values)` exactly as
  `submit()` does. If invalid: `setMissingFields(validation.missingFields)` and a
  notice telling the user to complete the form — the form is already showing, so
  the existing missing-field UI does the rest, and nothing is persisted. If
  valid: `await create({ collectionId, schemaId: activeSchemaId, payload: values })`
  (the same call `submit()` makes for a new record), then `setActiveRecordId` to
  the saved id and notice `"Record published from JSON."`.

Reusing `validateFormValues` + `create` rather than calling `submit()` directly
keeps `submit()` reading from React state (which has not re-rendered yet within
the handler) a non-issue — the handler passes `values` explicitly.

Alternative considered: publish unconditionally and let the server reject an
incomplete payload. Rejected — the client already owns required-field validation
for the form's own submit; routing the JSON path through the same check keeps the
two entry points consistent and gives the user the same inline feedback.

Alternative considered: a mode/among-radio choice made before pasting. Rejected —
the user does not need to decide until the JSON is in and valid; two buttons at
the point of action is simpler.

### Where the toggle lives

Put the toggle in the `FormPanel` heading (next to the "Form filler" eyebrow),
passed as an `onEnterImport` prop, rather than in `FormFillerHeader` — it is only
meaningful when a schema is loaded, which `FormPanel` already knows via
`schemaName`/`fields`. `FormFillerHeader` keeps only workspace-level actions.

The button sits on the white `builder-panel`, not the dark topbar where the
schema builder's toggle lives, so it uses `button button-outline` (teal text,
light border) — `button-secondary` is styled near-white for the dark topbar and
is invisible here. The import panel's own controls use the same light-panel
styles (`button-outline` for "Back to form" / "Open in form", `button-add` for
"Publish record"), and a shared `.button:disabled` rule dims the actions while
the textarea is empty.

## Risks / Trade-offs

- **Silent replacement of a partly-filled form** → mitigated by the panel's
  explicit "replaces all current values" note; not blocked, to keep the flow
  fast (same call the schema builder made).
- **Coercion surprises (e.g. `"true"` string → `true` boolean? `1` → `true`?)** →
  the table is deliberately conservative: booleans only from real booleans,
  numbers only from finite numbers or numeric strings, everything else falls to
  the empty initial value. Documented; the user edits in the form afterwards.
- **Array item conforming for deeply nested arrays could feel slow on huge
  payloads** → conforming is O(values) and bounded by the schema's field count
  per level; the form already renders arbitrarily nested saved records. No limit
  added; revisit only if it becomes real.
- **A `null`-typed field always overwriting to `null`** → matches
  `createInitialValue` and the disabled `null` input in the field editor; a
  `null` field has no other legal value.
