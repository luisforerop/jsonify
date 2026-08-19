## Why

Users can already design JSON Schemas in the schema-builder view, but there is no way to use a saved schema to collect data. Teams need a way to pick a saved schema and fill in matching values through a generated form, so the resulting data can be captured without hand-writing JSON.

## What Changes

- Add a schema-form-filler view where a user selects one of their saved schemas to load.
- Generate a form dynamically from the loaded JSON Schema's properties, including nested object and array structures, so each field matches the schema's declared type.
- Let the user fill in and submit values for the generated form.
- Expose form-entry create, read, update, and delete operations through external hooks, mirroring the existing saved-schema hook pattern so a future API migration only replaces the hook adapter.
- Save submitted form data to browser localStorage through the new persistence hooks, associated with the source schema.

## Capabilities

### New Capabilities

- `schema-form-filler`: Load a saved JSON Schema, render a matching form, and manage locally saved form submissions through persistence hooks.

### Modified Capabilities

None.

## Impact

- Affects the Next.js application with a new client view and new external CRUD hooks; reuses the existing `useSavedSchemas` hook to list and load saved schemas.
- Adds a second localStorage-backed persistence adapter for form submissions, following the same hook-boundary pattern as `use-saved-schemas.ts` so it can later be replaced by a REST API or Next.js function.
- Introduces no server APIs or external dependencies.
