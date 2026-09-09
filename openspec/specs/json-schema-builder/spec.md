# Json Schema Builder Specification

## Purpose

Provide a form-based workspace for creating valid, nested JSON Schemas and retaining saved schemas in the server's relational store.

## Requirements

### Requirement: Start a named schema

The system SHALL allow a user to enter a name before defining the properties of a new JSON Schema. The generated schema SHALL use that name as its title.

#### Scenario: Start a schema with a name

- **WHEN** the user enters a schema name
- **THEN** the builder displays a root schema ready to receive properties using that name as its title

### Requirement: Define typed properties

The system SHALL allow a user to add, rename, change the type of, and remove properties at any editable object level. The available property types SHALL include string, number, integer, boolean, null, object, and array.

#### Scenario: Add a scalar property

- **WHEN** the user adds a property named `age` with type number
- **THEN** the generated schema includes `age` under the current object's `properties` with `type` set to `number`

#### Scenario: Change a property type

- **WHEN** the user changes an existing property's type
- **THEN** the generated schema reflects the selected type and removes configuration that is incompatible with that type

#### Scenario: Remove a property

- **WHEN** the user removes a property
- **THEN** that property no longer appears in the builder or the generated schema

### Requirement: Model nested structures

The system SHALL allow object properties to contain their own typed properties at arbitrary nesting levels. The system SHALL allow an array property to define an item type and SHALL allow object array items to contain nested properties.

#### Scenario: Add nested object properties

- **WHEN** the user adds an object property and then adds a property inside it
- **THEN** the generated schema represents the outer property as an object with the inner property in its `properties`

#### Scenario: Configure object array items

- **WHEN** the user selects object as an array's item type and adds an item property
- **THEN** the generated schema represents the array item definition as an object containing that property

### Requirement: Generate a schema from a sample JSON document

The system SHALL provide a JSON-import mode in the schema builder, reachable as an
explicit choice from the builder interface, in which the user submits a single
JSON document as text and the system generates the root schema's properties by
inferring them from that document. The import mode SHALL be reversible: choosing
it SHALL NOT discard the ability to return to manual property editing.

Inference SHALL map JSON values to property types as follows: a string value maps
to `string`; a number with no fractional part maps to `integer`; a number with a
fractional part maps to `number`; a boolean maps to `boolean`; `null` maps to
`null`; an array maps to `array`; and an object maps to `object` whose properties
are inferred recursively from that object's members.

Generation SHALL NOT persist anything. The generated properties SHALL populate the
builder as an editable draft.

#### Scenario: Generate from a flat object

- **WHEN** the user submits `{ "test": "abc", "numeros": 123 }` in JSON-import mode
- **THEN** the builder is populated with a `test` property of type `string` and a
  `numeros` property of type `integer`, and the generated schema represents both
  under the root object's `properties`

#### Scenario: Infer number vs integer

- **WHEN** the user submits an object containing `{ "price": 9.99, "count": 4 }`
- **THEN** the `price` property has type `number` and the `count` property has
  type `integer`

#### Scenario: Infer nested object properties

- **WHEN** the user submits an object whose member `address` is itself an object
  with a `city` string
- **THEN** the `address` property has type `object` and contains a `city`
  property of type `string` in its own `properties`

#### Scenario: Infer an array of scalars

- **WHEN** the user submits an object whose member `tags` is `["a", "b"]`
- **THEN** the `tags` property has type `array` with an item type of `string`

#### Scenario: Infer an array of objects

- **WHEN** the user submits an object whose member `items` is an array whose first
  element is an object with a `sku` string
- **THEN** the `items` property has type `array` whose object item definition
  contains a `sku` property of type `string`

#### Scenario: Infer an empty or null-only value

- **WHEN** a member's value is an empty array or `null`
- **THEN** the corresponding property is still created — an empty array yields an
  `array` property with a `string` item type, and `null` yields a property of
  type `null`

#### Scenario: Edit the generated schema after import

- **WHEN** the user has generated a schema from JSON and the builder shows the
  editor with the inferred properties
- **THEN** the user can add, rename, retype, and remove properties and save the
  schema through the normal save flow, exactly as for a manually built schema

#### Scenario: Reject invalid JSON

- **WHEN** the user submits text that is not valid JSON
- **THEN** the system reports the input as invalid, generates no schema, and
  leaves any existing builder state unchanged

#### Scenario: Reject a non-object top-level value

- **WHEN** the user submits valid JSON whose top-level value is an array, string,
  number, boolean, or `null`
- **THEN** the system reports that a JSON object is required, generates no schema,
  and leaves any existing builder state unchanged

### Requirement: Manage schemas through a persistence boundary

The system SHALL expose create, read, update, and delete operations for saved
JSON Schemas, scoped to the active collection within the active workspace,
through external client-side hooks. The schema-builder interface SHALL use those
hooks rather than accessing browser localStorage directly. The hook
implementation SHALL persist schemas in the relational store through the server,
and its create, read, update, and delete operations SHALL be asynchronous. Each
saved schema SHALL carry a name that is unique within its collection, enforced
atomically by a database unique index. A saved schema SHALL remain available
after the browser page is reloaded, including from a different browser or machine
using the same server, still associated with its collection and workspace.

#### Scenario: Save a valid schema

- **WHEN** the user selects save for a named schema within an active collection
- **THEN** the interface creates the generated JSON Schema through the persistence hook, associated with that collection and its workspace, and the user receives confirmation that it was saved

#### Scenario: Update a saved schema

- **WHEN** the user saves changes to an existing schema
- **THEN** the interface updates that schema through the persistence hook without creating a duplicate saved entry

#### Scenario: Reject a duplicate schema name in a collection

- **WHEN** the user saves a new schema whose name matches another schema in the same collection
- **THEN** the database unique index rejects the insert and the system reports the conflict without creating a second schema with that name

#### Scenario: Load saved schemas

- **WHEN** the schema-builder view becomes available for an active collection
- **THEN** it obtains that collection's saved schemas through the persistence hook

#### Scenario: Delete a saved schema

- **WHEN** the user deletes a saved schema
- **THEN** the interface removes that schema through the persistence hook and it no longer appears in the saved collection

#### Scenario: Reload after saving

- **WHEN** the user reloads the application after saving a schema
- **THEN** the saved JSON Schema remains available through the persistence hook, still associated with its collection

#### Scenario: Schemas are isolated per collection

- **WHEN** two different collections each have saved schemas
- **THEN** the schema-builder opened for one collection does not display the other collection's schemas
