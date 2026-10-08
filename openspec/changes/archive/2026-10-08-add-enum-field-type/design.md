## Context

Schemas are modeled in two parallel shapes: `BuilderNode` (editor state, `lib/schema-builder.ts`) and `JsonSchema` (stored/emitted). The form filler derives `FormField`s from the stored `JsonSchema` (`lib/schema-form.ts`). The type list `JSON_SCHEMA_TYPES` is shared by the builder's type selectors and by the "is this a known type" guards in both derivations. Schemas are persisted as JSON and records are validated server-side with Ajv, which already understands `enum`. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- `enum` selectable in the builder (properties and array items), emitted as standard JSON Schema, rendered as a dropdown in the form.
- Zero changes to storage, API, or server validation.

**Non-Goals:**
- Non-string enums (numbers, mixed values), `const`, `oneOf`-with-titles, display labels distinct from values.
- Multi-select enums.
- Inferring enums when generating a schema from sample JSON.
- Option reordering UI.

## Decisions

**1. `enum` is a builder-only pseudo-type; the stored schema stays `type: "string"` + `enum`.**
Add `"enum"` to the builder's selectable types, but never emit `type: "enum"` (not valid JSON Schema). `toJsonSchema` writes `{ type: "string", enum: [...] }`; `builderNodeFromJsonSchema` maps a string schema with an `enum` array back to an `enum` node. This matches the project's hybrid direction (native UI type, JSON Schema standard in the DB) and keeps Ajv validation and the public API correct with no changes.
*Alternative:* store a custom `type: "enum"` — rejected, it breaks Ajv and portability.

**2. Separate the UI type list from the JSON Schema type.**
`JSON_SCHEMA_TYPES` currently doubles as both. Introduce a `BuilderNodeType = JsonSchemaType | "enum"` (and a `BUILDER_TYPES` list for the selectors) so `JsonSchema.type` stays a real JSON Schema type. `FormField` also gets the `enum` type plus `options`, since the form needs to know to render a dropdown; it is derived from the stored schema, so it detects `type: "string"` with `enum`.
*Alternative:* add `"enum"` to `JsonSchemaType` — rejected, it would let invalid schemas typecheck.

**3. Options live on the node as `enumValues: string[]`.**
`changeNodeType` clears `enumValues` for other types and initializes it to `[]` for enum. Same pattern as `properties`/`items` today. The editor shows a small list of text inputs with add/remove, rendered under the property row like the object/array sub-editors, and also under the array item-type selector when items are enum.

**4. Empty value for enum is `""`, stored values are plain strings.**
`createInitialValue` returns `""` for enum, consistent with string fields, and `isEmptyValue` already treats `""` as empty, so required-field checks work unchanged. The dropdown includes a blank first option bound to `""`.

**5. JSON import and stale values are filtered by `conformValue`.**
For an enum field, a raw value is kept only if it is a string contained in `options`; otherwise `""`. Loading an existing record goes through the same display path: a value not in the options shows no selection (React `<select>` with no matching option renders blank), and required validation then blocks submit because we normalize via `conformValue` when loading. Records already saved with out-of-range values are not mutated.

**6. Builder validation in `validatePropertyLevel`.**
Add checks: at least one option, no blank (trimmed) options, no duplicates. Applies to enum properties and enum array items. Options are trimmed when emitting the schema.

## Risks / Trade-offs

- [Existing schemas with `type: "string"` + `enum` created elsewhere will now appear as enum nodes, and non-string enum values would be dropped] → Only map to the enum node when every `enum` entry is a string; otherwise keep it as a plain `string` node (the stale `enum` is not preserved, which is acceptable for builder-made schemas).
- [Removing an option can invalidate existing records] → Out of scope; records keep their value, and the form shows no selection until the user picks a valid one. Server validation will reject re-submission of the old value.
- [Renaming an option does not migrate records] → Same as above; noted as a follow-up if it matters.
- [Widening the type union touches every `switch`/guard on type] → TypeScript exhaustiveness plus updated unit tests for `schema-builder` and `schema-form` catch misses.
