# Schema Form Filler Specification

## Purpose

Lets users pick a saved JSON Schema, fill in matching values through a generated form, and manage the resulting records through persistence hooks.

## Requirements

### Requirement: Load a saved schema into the form filler

The system SHALL let a user select one of the active collection's saved JSON
Schemas to load into the form-filler view.

#### Scenario: Load a saved schema

- **WHEN** the user selects a saved schema from the list
- **THEN** the form-filler view loads that schema and renders a form matching its structure

#### Scenario: No saved schemas available

- **WHEN** the user opens the form-filler view for a collection with no saved schemas
- **THEN** the view indicates there are no saved schemas to load and does not render a form

#### Scenario: Schema list scoped to the active collection

- **WHEN** the active collection has saved schemas and other collections also have saved schemas
- **THEN** the form-filler's schema picker lists only the active collection's schemas

### Requirement: Generate a form from a loaded schema

The system SHALL generate form fields from the loaded JSON Schema's properties, using each property's declared type to choose a matching input, and SHALL support nested object properties and array properties.

#### Scenario: Render fields for scalar properties

- **WHEN** a loaded schema declares string, number, integer, or boolean properties
- **THEN** the form renders a matching input for each property, using its name as the field label

#### Scenario: Render fields for nested object properties

- **WHEN** a loaded schema declares an object property with its own nested properties
- **THEN** the form renders the nested properties grouped under that object property

#### Scenario: Render fields for array properties

- **WHEN** a loaded schema declares an array property
- **THEN** the form lets the user add, edit, and remove items matching the array's declared item type

#### Scenario: Mark required fields

- **WHEN** a loaded schema marks a property as required
- **THEN** the form indicates that field is required and blocks submission while it is empty

### Requirement: Submit and persist form data

The system SHALL let a user submit filled-in values from the generated form and
SHALL save the submitted data as a record, associated with both the collection it
was created in and the source schema used to generate the form, through external
persistence hooks.

#### Scenario: Submit a completed form

- **WHEN** the user submits a form with all required fields filled in
- **THEN** the interface creates a record through the persistence hook, associated with the active collection and the loaded schema, and the user receives confirmation that it was saved

#### Scenario: Block submission with missing required fields

- **WHEN** the user submits a form while a required field is empty
- **THEN** the interface reports which fields are missing and does not create a record

### Requirement: Manage records through a persistence boundary

The system SHALL expose create, read, update, and delete operations for records
through external client-side hooks. The form-filler interface SHALL use those
hooks rather than accessing browser localStorage directly, and SHALL limit the
records it displays to those belonging to the active collection. The hook
implementation SHALL persist records in the relational store through the server,
and its create, read, update, and delete operations SHALL be asynchronous. A
saved record SHALL remain available after the browser page is reloaded, including
from a different browser or machine using the same server.

#### Scenario: List saved records

- **WHEN** the form-filler view becomes available
- **THEN** it obtains the active collection's records through the persistence hook

#### Scenario: Edit a saved record

- **WHEN** the user loads a previously saved record and submits changed values
- **THEN** the interface updates that record through the persistence hook without creating a duplicate

#### Scenario: Delete a saved record

- **WHEN** the user deletes a saved record
- **THEN** the interface removes that record through the persistence hook and it no longer appears in the saved-records list

#### Scenario: Reload after submitting

- **WHEN** the user reloads the application after submitting a record
- **THEN** the saved record remains available through the persistence hook

#### Scenario: Records are isolated per collection

- **WHEN** two different collections each have records
- **THEN** the form-filler's saved-records list for one collection does not show the other collection's records

### Requirement: Copy a record as JSON

The system SHALL let a user copy a record's submitted values to the clipboard as
JSON directly from the saved-records list.

#### Scenario: Copy a record's values

- **WHEN** the user selects the copy action for a saved record
- **THEN** the interface writes that record's values to the clipboard as formatted JSON and confirms the copy succeeded

#### Scenario: Clipboard copy fails

- **WHEN** the clipboard copy action does not succeed
- **THEN** the interface reports that the copy failed without altering the saved record

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
  loading the values into the form. The JSON-import view stays open and confirms
  the save. When a required field is missing, no record is created and the
  JSON-import view reports which fields are missing; the user can correct the
  JSON or choose **Open in form** to fill them in.

Either action SHALL start a new record rather than modifying the record currently
being edited. Mapping, "Open in form", and a blocked "Publish record" SHALL NOT
persist anything, and "Publish record" SHALL NOT alter the form's current values.

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
- **THEN** the system creates a new record from the mapped values without loading
  them into the form, the JSON-import view stays open, and it confirms the record
  was saved

#### Scenario: Publish blocked by a missing required field

- **WHEN** the mapped values leave a required field of the loaded schema empty
  and the user chooses "Publish record"
- **THEN** no record is created, the form's current values are unchanged, and the
  JSON-import view reports which required fields are missing

#### Scenario: Reject invalid JSON

- **WHEN** the user submits text that is not valid JSON
- **THEN** the system reports the input as invalid, populates nothing, and leaves
  the current form values unchanged

#### Scenario: Reject a non-object top-level value

- **WHEN** the user submits valid JSON whose top-level value is an array, string,
  number, boolean, or `null`
- **THEN** the system reports that a JSON object is required, populates nothing,
  and leaves the current form values unchanged
