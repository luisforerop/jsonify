## Why

Filling a schema-generated form field-by-field is slow when the user already has
the data as a JSON payload — for example a record exported from elsewhere, an API
response, or a copied record. When a schema is loaded, the form's shape is fully
known, so the user should be able to paste a JSON object and have the form
populate itself instead of retyping every value.

## What Changes

- Add a **"Fill from JSON"** entry point to the form filler: a mode, available
  once a schema is loaded, where the user pastes a JSON object and the system
  maps its values onto the current form fields.
- From that mode the user chooses what happens next:
  - **Open in form** — return to the normal form with the mapped values
    pre-filled, to review and edit before saving (the default, non-committal
    path).
  - **Publish record** — save the mapped values as a record immediately without
    going through the form view. If required fields are missing the record is not
    saved; the form opens with the mapped values and the missing fields flagged
    so the user can complete it.
- Map values by field, guided by the loaded schema — not blindly: each pasted
  value is coerced to its field's type (string, number/integer, boolean, `null`),
  nested objects and arrays are mapped recursively against the schema's structure,
  keys with no matching field are ignored, and fields absent from the JSON keep
  their empty initial value.
- The populated form is the normal working form: the user can keep editing every
  field and submits through the existing save flow. "Open in form" persists
  nothing on its own; "Publish record" saves through the same record-creation
  path the form's submit button uses. Either way a new record is created — the
  record currently being edited is not overwritten.
- Either action replaces all current form values at once; because that is
  destructive, the panel states so.
- Invalid JSON, or a top-level value that is not a JSON object, is rejected with
  an inline message and the form values are left unchanged.
- The form filler still opens in the normal form; "Fill from JSON" is an
  explicit, reversible choice that does not replace manual field editing.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `schema-form-filler`: The form filler gains a JSON-import path that maps a
  pasted JSON object onto the generated form's values (including nested objects
  and array items), type-coercing each value against the loaded schema, and lets
  the user either open those values in the form for review or publish them
  straight to a record without opening the form.

## Impact

- `lib/schema-form.ts`: new pure function that parses a JSON string and produces a
  `FormValues` object conformed to a given `FormField[]` (type coercion, recursion
  into objects/arrays, unknown-key drop, missing-key defaults via
  `createInitialValue`), plus a typed parse/validation result.
- `app/form-filler.tsx`: new UI state for the import mode; an "open in form"
  handler that wires the produced values into the existing `values` state, and a
  "publish" handler that additionally runs the existing validation and record
  creation. Both clear `activeRecordId` and switch back to the form.
- New `app/components/form-filler/json-import-panel.tsx` for the JSON input
  panel, following the existing panel/heading structure (mirrors
  `app/components/schema-builder/json-import-panel.tsx`), with "Open in form" and
  "Publish record" actions.
- Tests for the conforming function (`lib/schema-form.test.ts`) covering scalars
  and coercion, nested objects, arrays of scalars and of objects, unknown keys,
  missing keys, and invalid / non-object input.
