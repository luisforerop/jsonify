## Context

See proposal.md for motivation and specs/schema-form-filler/spec.md for user-visible requirements. The application already has a `useSavedSchemas` hook (`hooks/use-saved-schemas.ts`) that lists, creates, updates, and deletes saved `JsonSchema` documents in localStorage under a namespaced key, and a builder-node model (`lib/schema-builder.ts`) for representing schema properties. This change adds a second view that consumes saved schemas rather than authoring them, and introduces a new persistence boundary for the data entered into the generated form.

## Goals / Non-Goals

**Goals:**

- Reuse `useSavedSchemas` to list and load existing saved schemas rather than duplicating schema storage.
- Derive a form field tree from a loaded `JsonSchema` using the same recursive shape already used for object properties and array items.
- Isolate form-entry CRUD behind a new external hook, following the exact pattern of `useSavedSchemas`, so a future API migration only replaces the hook adapter.
- Validate required fields (as declared by the schema's `required` array) before allowing submission.

**Non-Goals:**

- Advanced JSON Schema validation keywords (patterns, min/max, formats, enums, references, composition).
- Editing the loaded schema itself from the form-filler view.
- Associating multiple schema versions with historical form entries; a form entry is tied to the schema as it existed when submitted.
- Remote synchronization, authentication, or multi-user collaboration.

## Decisions

### Derive form fields from `JsonSchema` directly, not from `BuilderNode`

The form-filler will walk the saved `JsonSchema` document's `properties`, `type`, `items`, and `required` fields to build a form field tree, rather than converting to `BuilderNode` via `propertiesFromJsonSchema`. `BuilderNode` carries builder-only concerns (client-side ids for editing, mutable type-switching) that the form filler does not need; the form filler instead needs to track submitted values keyed by property path.

An alternative considered: reuse `propertiesFromJsonSchema` for both structure and rendering. Rejected because it would couple the form-filler's data model to builder-editing concerns and require stripping fields that are meaningless once schema editing is out of scope.

### New `useFormEntries` hook mirrors `useSavedSchemas`

A new hook (e.g. `hooks/use-form-entries.ts`) will expose the same shape as `useSavedSchemas`: `{ entries, error, isLoaded, create, read, update, remove }`, operating on records of the form `{ id, name, schemaId, schemaName, values, createdAt, updatedAt }`. The user-supplied `name` identifies the entry in the saved-entries list, independent of the source schema's name. It will persist to a separate namespaced localStorage key (e.g. `jsonify.form-entries.v1`) using the same defensive-parsing and client-only-access approach as `use-saved-schemas.ts`.

Mirroring the existing hook's contract (rather than inventing a different shape) keeps both persistence boundaries consistent, so a later migration to a REST API or Next.js function can apply the same adapter pattern to both.

### Values keyed by property path

Submitted values will be stored in a nested plain object keyed by property name, mirroring the schema's own nesting (objects nest, arrays hold a list of item values). This keeps the persisted `values` shape structurally identical to what a JSON Schema validator would expect, simplifying any future validation against the schema.

An alternative considered: a flat map keyed by dot-path strings (e.g. `"address.city"`). Rejected because it would require an extra flatten/unflatten step when re-loading a saved entry into the form or handing data to a future backend.

### Required-field validation uses the schema's `required` arrays only

Submission validation will check that every property name listed in a `required` array (at each nesting level) has a non-empty value, matching the same required-property semantics already produced by the schema builder. No additional validation keywords are interpreted.

### Copy-as-JSON reads directly from the stored entry

The saved-entries list's copy action will serialize the already-persisted `values` object for that entry (`JSON.stringify(entry.values, null, 2)`) and write it to the clipboard via the browser Clipboard API, entirely within the panel component. No new hook method or persisted state is needed since the action neither creates nor mutates a form entry; a local, transient success/failure indicator on the button is enough to confirm the outcome to the user.

## Risks / Trade-offs

- [A loaded schema can change or be deleted after form entries reference it] -> Store the schema name and a copy of the schema id on the form entry so the entry remains identifiable even if the source schema is later edited or removed; do not attempt live re-validation against a schema that may no longer exist.
- [Deeply nested schemas can produce large, hard-to-scan forms] -> Reuse the same indented, grouped rendering approach as the schema builder's nested property editor.
- [Array item forms need stable per-item identity for add/remove] -> Key rendered array items by position; items are only appended or removed (never reordered), so an index-based key stays stable across those operations without introducing extra client-side identity state.
- [Two localStorage keys must both succeed for a full user flow] -> Keep the two hooks independent; a failure in one (e.g. quota exceeded) surfaces its own error without blocking the other's data.
- [Clipboard access can be blocked by browser permissions or an insecure context] -> Wrap the copy action in a try/catch and show a transient failure indicator instead of throwing, since copying is a convenience action and not required for the entry to remain saved.

## Migration Plan

1. Add the new `useFormEntries` hook with a localStorage adapter under its own namespaced, versioned key, following `use-saved-schemas.ts` as a reference implementation.
2. Add the form-filler view and schema-to-form-field derivation, wired to `useSavedSchemas` (read-only) and `useFormEntries` (create/read/update/delete).
3. Replace only the `useFormEntries` adapter with a REST client or Next.js function when backend persistence is introduced, preserving its hook contract.
4. Roll back by removing the form-filler view; existing form-entry localStorage values are isolated to their own application key and can remain harmlessly until a later cleanup path is introduced.
