## MODIFIED Requirements

### Requirement: Generate a form from a loaded schema

The system SHALL generate form fields from the loaded JSON Schema's properties, using each property's declared type to choose a matching input, and SHALL support nested object properties and array properties. A string property that declares an `enum` of allowed values SHALL be rendered as a dropdown rather than a free-text input.

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

#### Scenario: Render an enum property as a dropdown

- **WHEN** a loaded schema declares a property of type `string` with `enum` `["draft", "published"]`
- **THEN** the form renders a dropdown for that property, using its name as the label, whose choices are exactly `draft` and `published` in schema order, plus an empty choice meaning no selection

#### Scenario: Enum field starts unselected

- **WHEN** the form is first rendered or reset for a schema with an enum property
- **THEN** the enum dropdown shows no selection

#### Scenario: Required enum field blocks submission

- **WHEN** an enum property is marked required and the user submits without selecting an option
- **THEN** the interface reports that field as missing and does not create a record

#### Scenario: Selecting an option stores it as text

- **WHEN** the user selects `published` in an enum dropdown and submits
- **THEN** the saved record holds the string `published` for that property

#### Scenario: Enum inside objects and arrays

- **WHEN** a loaded schema declares an enum property inside an object property, or an array whose items are an enum
- **THEN** the nested enum property, or each array item, renders as a dropdown of the allowed options

#### Scenario: Editing a record with a value outside the options

- **WHEN** the user loads a saved record whose enum value is no longer among the schema's options
- **THEN** the dropdown shows no selection and the user must choose a valid option before submitting

## ADDED Requirements

### Requirement: Constrain JSON-imported values to enum options

When populating the form from a pasted JSON object, the system SHALL set an enum field only from a member whose value is one of the field's allowed options. Any other value, including a non-string value, SHALL leave that field with no selection.

#### Scenario: Import a valid enum value

- **WHEN** the loaded schema has a `status` enum field with options `draft` and `published` and the user submits `{ "status": "published" }` in JSON-import mode
- **THEN** the form's `status` field holds `published`

#### Scenario: Import an invalid enum value

- **WHEN** the user submits `{ "status": "archived" }` for that schema
- **THEN** the form's `status` field has no selection and the rest of the form is populated normally

#### Scenario: Publish blocked by an invalid required enum value

- **WHEN** `status` is a required enum field, the submitted JSON gives it a value outside the options, and the user chooses "Publish record"
- **THEN** no record is created and the JSON-import view reports `status` as missing
