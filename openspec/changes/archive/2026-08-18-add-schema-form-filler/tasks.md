## 1. Form-Entry Model

- [x] 1.1 Define a recursive form-field-value model derived from a `JsonSchema` (objects nest values by property name, arrays hold a list of item values).
- [x] 1.2 Implement a function that derives a form field tree (name, type, required, nested properties/items) from a loaded `JsonSchema`.
- [x] 1.3 Implement a function that produces an initial empty values object matching a derived form field tree.
- [x] 1.4 Add validation that checks every property listed in a schema's `required` array (at each nesting level) has a non-empty value before submission.

## 2. Form-Entry Persistence Hook

- [x] 2.1 Define external form-entry CRUD hook types (`id`, `schemaId`, `schemaName`, `values`, `createdAt`, `updatedAt`) mirroring the `useSavedSchemas` hook contract.
- [x] 2.2 Implement the initial localStorage-backed `useFormEntries` hook adapter with its own namespaced, versioned storage key, defensive parsing, and client-only access.
- [x] 2.3 Keep localStorage access inside the hook adapter and expose persistence errors and refreshed form-entry state through the hook contract.

## 3. Form-Filler Interface

- [x] 3.0 Add a required entry-name field to the form-filler view and the `useFormEntries` record, and show that name (not just the schema name) in the saved-entries list.
- [x] 3.1 Add a schema-form-filler view that lists saved schemas (via `useSavedSchemas`) for the user to select and load.
- [x] 3.2 Render an empty-state message when no saved schemas exist instead of a form.
- [x] 3.3 Render a generated form from the loaded schema's field tree, with recursive controls for nested object properties and add/edit/remove controls for array items.
- [x] 3.4 Mark required fields in the rendered form and block submission while any are empty, surfacing which fields are missing.
- [x] 3.5 Connect submission to the `useFormEntries` hook to create a new form entry, or update an existing loaded entry, without direct localStorage access.
- [x] 3.6 Add a saved-entries list (or panel) that lets the user load an existing form entry back into the form for editing, and delete a saved entry.
- [x] 3.7 Style the form-filler workspace, nested fields, validation messaging, and saved-entries list consistently with the existing schema-builder workspace on desktop and mobile screens.
- [x] 3.8 Add a copy-as-JSON action next to each saved entry's delete action that writes that entry's values to the clipboard and shows transient success/failure feedback.

## 4. Verification

- [x] 4.1 Add focused tests for schema-to-form-field derivation, initial-values generation, required-field validation, and the localStorage CRUD hook across create, read, update, and delete operations.
- [x] 4.2 Run linting, production build, and a browser check that loads a saved schema, fills and submits a nested form, edits a saved entry, deletes it, and reloads the page.
