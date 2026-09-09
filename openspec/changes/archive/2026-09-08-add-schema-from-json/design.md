## Context

See proposal.md — Why. The schema builder (`app/schema-builder.tsx`) holds its
draft as `schemaName: string` and `properties: BuilderNode[]` in React state, and
derives the preview and the saved payload from those via pure helpers in
`lib/schema-builder.ts` (`createJsonSchema`, `propertiesFromJsonSchema`,
`changeNodeType`, `updateNode`, `removeNode`, `validateSchema`). Nodes carry an
`id` produced by a caller-supplied `createId()`. `propertiesFromJsonSchema`
already turns a `JsonSchema` into `BuilderNode[]` when opening a saved schema.

## Goals / Non-Goals

**Goals:**
- Infer a `BuilderNode[]` draft from a pasted JSON document using only the
  existing `JsonSchemaType` set, so the result flows through every existing
  builder helper unchanged.
- Keep inference a pure, separately tested function with no React or DOM
  dependency.
- Make the import a reversible mode within the existing builder view, not a new
  route.

**Non-Goals:**
- No merging of heterogeneous array elements into unions or `anyOf` — JSON Schema
  here has no union type, and the builder cannot express one.
- No format detection (`date`, `email`, `uri`) or constraint inference
  (`minLength`, `enum`, `minimum`).
- No inference of `required` from key presence — imported properties start
  optional, matching how manually added properties start.
- No file upload; a paste-in textarea only.

## Decisions

### Reuse `JsonSchema` → build a schema, then reuse `propertiesFromJsonSchema`

The new function infers a `JsonSchema` object from the sample, then delegates to
the existing `propertiesFromJsonSchema(schema, createId)` to get `BuilderNode[]`.
This keeps a single code path from "a schema" to "builder nodes" and means array
`items`, nested objects, and type coercion all behave identically to opening a
saved schema.

Signature:

```ts
type JsonImportResult =
  | { ok: true; title?: string; properties: BuilderNode[] }
  | { ok: false; error: string };

function schemaFromSampleJson(input: string, createId: () => string): JsonImportResult;
```

Alternative considered: build `BuilderNode[]` directly from the parsed value.
Rejected — it duplicates the type-mapping and nesting logic that
`propertiesFromJsonSchema` + `builderNodeFromJsonSchema` already implement.

### Value → type mapping

| JSON value                     | inferred `type`                    |
| ------------------------------ | ---------------------------------- |
| string                         | `string`                           |
| number, `Number.isInteger`     | `integer`                          |
| number, otherwise              | `number`                           |
| boolean                        | `boolean`                          |
| `null`                         | `null`                             |
| array                          | `array`, `items` from element[0]   |
| object                         | `object`, `properties` recursed    |

- Empty array → `items: { type: "string" }` (the builder's own default item
  type), so the property still round-trips.
- Array of mixed types → infer from the first element only; the user retypes in
  the editor if needed. Documented, not an error.
- `-0`, very large integers within JSON's number range still classify by
  `Number.isInteger`.

### Top-level must be an object

The builder's root is always an `object` (`createObjectSchema`). A top-level
array/scalar has no properties to seed, so it is a validation error rather than a
silently empty import. `JSON.parse` failure and non-object success are two
distinct error messages.

### UI: a mode toggle inside the builder view

`SchemaBuilderInner` gains `mode: "editor" | "import"` state, defaulting to
`"editor"`. The `WorkspaceHeader` (or the editor panel heading) gets a "From
JSON" toggle. In import mode the editor panel is replaced by a new
`JsonImportPanel` (`app/components/schema-builder/json-import-panel.tsx`) with a
textarea, a "Generate schema" button, and an inline error slot. On success it
calls back with the inferred `properties` (and title if the sample carries no
better name — actually no title is inferred, name stays user-driven), sets
`properties`, clears `activeSchemaId` if appropriate, and switches `mode` back to
`"editor"`. The saved-schemas panel and preview panel stay visible throughout.

Generating over an existing draft replaces `properties` wholesale; because this is
destructive, the panel notes that generating replaces the current properties.

Alternative considered: a separate `/schema-builder/import` route. Rejected — the
spec requires landing back in the editor with the same draft, which is simpler as
one component's state than as cross-route navigation.

## Risks / Trade-offs

- **First-element-only array inference produces a wrong item type for
  heterogeneous arrays** → item type is a one-click change in the editor, and the
  preview makes the result visible before saving.
- **Large pasted payloads deep-nest the builder tree and could feel slow** →
  inference is O(nodes) and the builder already renders arbitrarily nested saved
  schemas; no new limit added, revisit only if it becomes a real problem.
- **Silent replacement of an in-progress manual draft** → mitigated by an
  explicit warning in the import panel; not blocked, to keep the flow fast.
