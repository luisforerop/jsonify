## ADDED Requirements

### Requirement: Populate the form from a pasted JSON object

The system SHALL provide a JSON-import mode in the form filler, available only
once a schema is loaded and reachable as an explicit choice from the form-filler
interface, in which the user submits a single JSON object as text and the system
sets the form's values by mapping that object's members onto the fields generated
from the loaded schema. The import mode SHALL be reversible: choosing it SHALL NOT
discard the ability to return to manual field editing.

Mapping SHALL be guided by the loaded schema's fields:

- A member whose key matches a field SHALL set that field's value, coerced to the
  field's type — a value going into a string field becomes text, a value going
  into a number or integer field becomes a number when it represents one and an
  empty value otherwise, a value going into a boolean field becomes a boolean,
  and a `null`-typed field stays `null`.
- A member whose key matches an object field SHALL be mapped recursively against
  that field's own nested fields.
- A member whose key matches an array field SHALL populate that array by mapping
  each element against the array's item definition; a member that is not an array
  SHALL leave the array field empty.
- A member whose key matches no field SHALL be ignored.
- A field with no matching member SHALL keep its empty initial value.

From JSON-import mode the user SHALL choose one of two actions once the mapping
succeeds:

- **Open in form** — the mapped values populate the form, the view returns to the
  form, and nothing is persisted. The user reviews, edits, and submits through
  the normal form flow.
- **Publish record** — the system maps the values, checks the loaded schema's
  required fields, and, when none are missing, creates a record from the mapped
  values through the same record-creation path the form's submit uses, without
  first showing the form. When a required field is missing, no record is created:
  the form opens with the mapped values and the missing fields flagged so the
  user can complete and submit it.

Either action SHALL start a new record rather than modifying the record currently
being edited. Mapping and "Open in form" SHALL NOT persist anything.

#### Scenario: Enter JSON-import mode only with a schema loaded

- **WHEN** the user opens the form filler before loading a schema
- **THEN** the JSON-import entry point is unavailable, and it becomes available
  once a schema is loaded

#### Scenario: Populate scalar fields with coercion

- **WHEN** a schema with a `name` string field and an `age` integer field is
  loaded and the user submits `{ "name": "Ada", "age": "42" }` in JSON-import
  mode
- **THEN** the form's `name` field holds `Ada` and its `age` field holds the
  number `42`

#### Scenario: Populate a nested object field

- **WHEN** the loaded schema has an `address` object field with a `city` string
  field and the user submits an object whose `address` member is
  `{ "city": "Paris" }`
- **THEN** the form's `address.city` field holds `Paris`

#### Scenario: Populate an array field

- **WHEN** the loaded schema has a `tags` array field with string items and the
  user submits an object whose `tags` member is `["a", "b"]`
- **THEN** the form's `tags` field has two items holding `a` and `b`

#### Scenario: Populate an array of objects

- **WHEN** the loaded schema has an `items` array field whose item definition is
  an object with a `sku` string field and the user submits an object whose
  `items` member is `[{ "sku": "X1" }, { "sku": "X2" }]`
- **THEN** the form's `items` field has two entries holding `sku` values `X1` and
  `X2`

#### Scenario: Ignore keys with no matching field

- **WHEN** the user submits a JSON object containing a key that the loaded schema
  does not define
- **THEN** that key is discarded and the rest of the form is populated normally

#### Scenario: Leave unmentioned fields empty

- **WHEN** the submitted JSON object omits a key for a field the schema defines
- **THEN** that field keeps its empty initial value and the user can fill it in
  manually

#### Scenario: Open the mapped values in the form

- **WHEN** the mapping succeeds and the user chooses "Open in form"
- **THEN** the view returns to the form showing the normal fields with those
  values, nothing is persisted, the user can change any field, and submitting
  saves a new record through the normal submit flow without altering any
  previously saved record

#### Scenario: Publish a record directly from JSON

- **WHEN** the loaded schema's required fields are all present in the mapped
  values and the user chooses "Publish record"
- **THEN** the system creates a new record from the mapped values through the
  same record-creation path the form's submit uses, without first showing the
  form, and confirms the record was saved

#### Scenario: Publish blocked by a missing required field

- **WHEN** the mapped values leave a required field of the loaded schema empty
  and the user chooses "Publish record"
- **THEN** no record is created, the form opens with the mapped values, and the
  missing required fields are flagged so the user can complete and submit it

#### Scenario: Reject invalid JSON

- **WHEN** the user submits text that is not valid JSON
- **THEN** the system reports the input as invalid, populates nothing, and leaves
  the current form values unchanged

#### Scenario: Reject a non-object top-level value

- **WHEN** the user submits valid JSON whose top-level value is an array, string,
  number, boolean, or `null`
- **THEN** the system reports that a JSON object is required, populates nothing,
  and leaves the current form values unchanged
