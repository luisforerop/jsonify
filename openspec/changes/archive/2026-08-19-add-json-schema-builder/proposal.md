## Why

Users need a way to construct JSON Schemas without manually writing nested JSON, so they can define structured data safely from an approachable form. The application currently has no schema-authoring workflow or local persistence for saved schemas.

## What Changes

- Add a schema-builder view where a user starts a new JSON Schema by naming it.
- Let users add and configure typed properties, including object, array, string, number, boolean, and other supported JSON Schema types.
- Support nested object properties so users can model hierarchical data.
- Expose schema create, read, update, and delete operations through external hooks, initially backed by browser localStorage.
- Save the generated JSON Schema to browser localStorage through the persistence hooks when the user selects save.

## Capabilities

### New Capabilities

- `json-schema-builder`: Create, edit, nest, and manage locally saved JSON Schemas through a form-based interface and persistence hooks.

### Modified Capabilities

None.

## Impact

- Affects the main Next.js application view, client-side state management, and new external CRUD hooks.
- Adds a localStorage-backed persistence adapter behind the hooks so it can later be replaced by a REST API or Next.js function.
- Introduces no server APIs or external dependencies.
