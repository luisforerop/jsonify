## 1. Schema Builder Model

- [x] 1.1 Define the recursive client-side property model, supported JSON Schema types, and helpers for creating and updating nodes by stable identifier.
- [x] 1.2 Implement transformation of the builder model into a JSON Schema document, including nested object properties and array item definitions.
- [x] 1.3 Add validation that requires a schema name and non-empty, unique property names within each object level before saving.

## 2. Schema Persistence Hooks

- [x] 2.1 Define external saved-schema CRUD hook types and a stable interface for creating, reading, updating, and deleting saved schema entries.
- [x] 2.2 Implement the initial localStorage-backed hook adapter with namespaced, versioned storage, defensive parsing, and client-only access.
- [x] 2.3 Keep localStorage access inside the hook adapter and expose persistence errors and refreshed saved-schema state through the hook contract.

## 3. Builder Interface

- [x] 3.1 Convert the main application view into a client-side schema-builder workspace with schema-name entry and a root property editor.
- [x] 3.2 Implement recursive property controls to add, rename, retype, and remove properties at each object level.
- [x] 3.3 Add type-specific controls so object properties expose nested properties and arrays expose an item-type editor with nested object-item properties.
- [x] 3.4 Connect the builder interface to the external CRUD hooks to load saved schemas and create, update, or delete entries without direct localStorage access.
- [x] 3.5 Style the workspace and recursive nesting so typed properties, hierarchy, validation errors, and actions remain clear on desktop and mobile screens.

## 4. Verification

- [x] 4.1 Add focused tests for JSON Schema generation, property-name validation, and the localStorage CRUD hook across create, read, update, and delete operations.
- [x] 4.2 Run linting, production build, and a browser check that creates, updates, deletes, and reloads a nested saved schema through the hooks.
