## Why

Building a schema property-by-property in the schema editor is slow when the user
already has an example of the data they want to model. Given a sample JSON
payload, the shape of the schema is fully determined — the user should be able to
paste that payload and get a ready-to-edit schema instead of re-entering every
field by hand.

## What Changes

- Add a **"From JSON"** entry point to the schema builder: a mode where the user
  pastes a JSON document, generates a schema inferred from it, and then lands in
  the normal schema editor with the inferred properties pre-populated.
- Infer property types from JSON values: strings → `string`, integral numbers →
  `integer`, non-integral numbers → `number`, booleans → `boolean`, `null` →
  `null`, arrays → `array` (with item type inferred from the elements), objects →
  `object` (with nested properties inferred recursively).
- The generated schema is a normal builder draft: once generated it is fully
  editable, previewable, and savable through the existing save flow. Nothing is
  persisted until the user saves.
- Invalid JSON, or a top-level value that is not a JSON object, is rejected with
  an inline message and no schema is generated.
- The builder starts in the editor as today; the "From JSON" mode is an explicit,
  reversible choice that does not replace manual property editing.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `json-schema-builder`: The builder gains a JSON-import path that generates the
  root schema's properties (including nested objects and arrays) from a pasted
  sample JSON document, after which the standard editor and save behavior apply.

## Impact

- `lib/schema-builder.ts`: new pure function that parses a sample JSON string and
  produces `BuilderNode[]` (and an optional inferred title) using the existing
  `JsonSchemaType` set, plus a typed parse/validation result.
- `app/schema-builder.tsx`: new UI state for the import mode, wiring the generated
  nodes into the existing `properties` state and switching back to the editor.
- New `app/components/schema-builder/*` component for the JSON input panel,
  following the existing panel/heading structure.
- Tests for the inference function (`lib/schema-builder.test.ts`) covering
  scalars, nested objects, arrays of scalars, arrays of objects, empty arrays,
  `null`, and invalid / non-object input.
