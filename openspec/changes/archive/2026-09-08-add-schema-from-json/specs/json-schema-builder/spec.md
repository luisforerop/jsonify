## ADDED Requirements

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
