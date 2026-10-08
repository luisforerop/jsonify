## Why

Users often need a property whose value must be one of a fixed set of options (status, category, size). Today the only way to model that is a free-text `string`, which lets users type invalid values. An `enum` property type lets the schema author define the allowed options once and gives the person filling the form a dropdown instead of a text box.

## What Changes

- Add `enum` as a selectable property type in the schema builder, alongside string, number, etc.
- When a property is of type `enum`, the builder lets the author define an ordered list of allowed string options (add, edit, remove).
- The generated JSON Schema represents an enum property as the standard `{ "type": "string", "enum": [...] }`, so it stays portable and is enforced by the existing server-side Ajv validation.
- Loading a saved schema (or a JSON Schema import) that has a `string` property with an `enum` array restores it as an `enum` property in the builder.
- The form filler renders an enum field as a dropdown (`<select>`) listing the allowed options, including inside nested objects and as array items.
- Builder validation requires an enum property to have at least one option, and options to be non-empty and unique.
- A required enum field is considered missing until an option is selected.
- JSON import in the form filler coerces a value into an enum field only if it matches an allowed option; otherwise the field is left empty.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `json-schema-builder`: the available property types gain `enum`, with option management, JSON Schema output, round-tripping, and validation.
- `schema-form-filler`: enum properties render as a dropdown, participate in required-field checks, and are constrained during JSON-import mapping.

## Impact

- `lib/schema-builder.ts`: `BuilderNode`/`JsonSchema` types, `changeNodeType`, `toJsonSchema`, `builderNodeFromJsonSchema`, `validateSchema`.
- `lib/schema-form.ts`: `FormField` derivation, `conformValue`, initial/empty value handling.
- `app/components/schema-builder/property-editor.tsx`: type selector entry and an options editor.
- `app/components/form-filler/field-editor.tsx`: dropdown rendering for enum fields.
- Tests for `lib/schema-builder` and `lib/schema-form`.
- No database migration (schemas are stored as JSON) and no API change; `validate-payload.ts` already enforces `enum` via Ajv.
