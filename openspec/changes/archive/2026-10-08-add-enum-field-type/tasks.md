## 1. Builder model (`lib/schema-builder.ts`)

- [x] 1.1 Add a `BuilderNodeType` (`JsonSchemaType | "enum"`) and `BUILDER_TYPES` list; add optional `enumValues: string[]` to `BuilderNode`; add optional `enum` to `JsonSchema`
- [x] 1.2 Update `changeNodeType` so switching to enum sets `enumValues: []` and switching away clears it
- [x] 1.3 Update `toJsonSchema` to emit `{ type: "string", enum: [...] }` (trimmed options) for enum nodes, including array items
- [x] 1.4 Update `builderNodeFromJsonSchema` to map a string schema whose `enum` is all strings to an enum node
- [x] 1.5 Update `validatePropertyLevel` for enum nodes (including array items): at least one option, no blank options, no duplicates, with per-property messages
- [x] 1.6 Add helpers to add, edit, and remove enum options on a node
- [x] 1.7 Add unit tests in `lib/schema-builder.test.ts` covering output, round-trip, type changes, validation, and that sample-JSON import never infers enums

## 2. Builder UI

- [x] 2.1 Use `BUILDER_TYPES` in the property and array-item type selectors in `app/components/schema-builder/property-editor.tsx`
- [x] 2.2 Add an options editor (list of text inputs with add/remove) shown for enum properties and enum array items
- [x] 2.3 Wire the option handlers through `schema-editor.tsx` / `app/schema-builder.tsx` state updates
- [x] 2.4 Confirm the schema preview shows the `enum` output and validation errors block saving

## 3. Form model (`lib/schema-form.ts`)

- [x] 3.1 Add `enum` to `FormField` with `options: string[]`; derive it in `formFieldFromJsonSchema` from a string schema with an all-string `enum`
- [x] 3.2 Make `createInitialValue` return `""` for enum and keep `isEmptyValue` treating it as empty for required checks
- [x] 3.3 Update `conformValue` so an enum field keeps a value only if it is a string among its options, otherwise `""`
- [x] 3.4 Add unit tests in `lib/schema-form.test.ts` for derivation, required validation, nested/array enum, and JSON-import filtering (valid, invalid, non-string)

## 4. Form UI

- [x] 4.1 In `app/components/form-filler/field-editor.tsx`, render enum fields (and enum array items) as a `<select>` with a blank option plus the allowed options in schema order
- [x] 4.2 Ensure loading a saved record with an out-of-range enum value shows no selection and triggers the required check
- [x] 4.3 Check the "Publish record" path in the JSON-import panel reports an invalid required enum value as missing

## 5. Verification

- [x] 5.1 Run lint and type check, and the unit tests with Node 22.23.2
- [x] 5.2 Manually verify in the app: create an enum property, save, reload, fill the form via dropdown, submit, and confirm the record and API validation (a value outside the options is rejected with 400)
