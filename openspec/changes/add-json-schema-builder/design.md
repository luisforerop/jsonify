## Context

The current application is a minimal Next.js client with no persistence layer or schema-editing domain model. See proposal.md for motivation and specs/json-schema-builder/spec.md for user-visible requirements. Browser localStorage is the explicitly requested persistence boundary for this first version.

## Goals / Non-Goals

**Goals:**

- Represent the editable schema as a recursive tree that can express object properties and array item definitions.
- Generate a JSON Schema document from that tree at save time.
- Isolate schema CRUD behind external hooks so the UI is independent of its persistence transport.
- Restore saved schema data from browser localStorage without server involvement in the initial implementation.
- Keep all browser-only operations out of server rendering paths.

**Non-Goals:**

- Remote synchronization, authentication, sharing, import/export, or collaboration.
- Advanced JSON Schema constraints such as validation patterns, descriptions, references, composition keywords, or required-property configuration.
- Persisting partial edits automatically before the user saves.

## Decisions

### Use a recursive builder-node model

Each property will be represented by a node with a stable client-side identifier, name, type, and optional child properties or array item definition. Recursive rendering makes each object level use the same editor surface and supports unrestricted nesting.

An alternative would be to mutate the generated JSON Schema object directly. A separate builder model is chosen because it preserves UI-only identifiers and avoids conditional JSON traversal spread across event handlers.

### Generate the JSON Schema on demand

Saving will transform the root builder node into a JSON Schema object: object nodes produce `type: "object"` and `properties`; array nodes produce `type: "array"` and `items`; scalar nodes produce their selected `type`. The schema name becomes the root `title`.

Keeping a generated schema in state was considered, but deriving it at save time prevents the editable model and output from falling out of sync.

### Expose persistence through external CRUD hooks

The builder view will depend on a dedicated external hook module that provides the saved-schema collection and create, read, update, and delete operations. The view will not import or call `localStorage` directly. The hook's public input and output types will describe saved schema entries rather than browser storage mechanics.

A direct localStorage implementation in the view was considered, but is rejected because replacing it later with a REST API or Next.js function would require modifying UI behavior. Concentrating transport and serialization inside the hook confines that future change to the persistence boundary.

### Implement the initial hook adapter with localStorage

The initial hook implementation will serialize saved schemas as a collection under a namespaced localStorage key. Each saved entry will include a stable identifier, schema name, and generated JSON Schema document. Create appends a new entry; update replaces the matching entry; delete removes it; read returns the collection. The UI will save a new schema through create and subsequently use update for an existing saved entry.

Saving one unstructured value per schema was considered, but one collection enables predictable retrieval and avoids relying on schema names as browser storage keys. A REST client or call to a Next.js function can later implement the same hook contract without changing the builder components.

### Treat localStorage as unavailable until the client is mounted

Reads and writes will occur only in client-side lifecycle or interaction code, with malformed stored data ignored rather than crashing the view. This prevents server-rendering failures and gives the UI a safe empty state.

## Risks / Trade-offs

- [Browser storage can be cleared or disabled] -> The hook reports persistence failures to the UI; no durability guarantee is implied for this version.
- [A future backend contract can diverge from the hook API] -> Keep the hook contract centered on saved-schema CRUD operations and add adapter tests before replacing the localStorage implementation.
- [Deep nesting can make the form difficult to scan] -> Render child properties indented beneath their parent and keep add/remove controls scoped to each level.
- [Duplicate or blank property names yield ambiguous output] -> Validate property names before save and block saving until each sibling name is non-empty and unique.
- [Malformed persisted values can occur] -> Parse stored data defensively and fall back to an empty saved-schema collection.

## Migration Plan

1. Deploy the external hook module with a localStorage adapter and an empty collection when no prior value exists.
2. Use a versioned, namespaced storage key to allow a future migration if the saved-entry format changes.
3. Replace only the hook adapter with a REST client or Next.js function when backend persistence is introduced, preserving the hook contract used by the builder UI.
4. Roll back by removing the builder UI; existing localStorage values are isolated to the application key and can remain harmlessly until a later cleanup path is introduced.
