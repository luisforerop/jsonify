## MODIFIED Requirements

### Requirement: Define typed properties

The system SHALL allow a user to add, rename, change the type of, and remove properties at any editable object level. The available property types SHALL include string, number, integer, boolean, null, object, array, and enum.

#### Scenario: Add a scalar property

- **WHEN** the user adds a property named `age` with type number
- **THEN** the generated schema includes `age` under the current object's `properties` with `type` set to `number`

#### Scenario: Change a property type

- **WHEN** the user changes an existing property's type
- **THEN** the generated schema reflects the selected type and removes configuration that is incompatible with that type

#### Scenario: Remove a property

- **WHEN** the user removes a property
- **THEN** that property no longer appears in the builder or the generated schema

## ADDED Requirements

### Requirement: Define enum properties

The system SHALL allow a user to choose `enum` as a property type, at any editable object level and as an array's item type. An enum property SHALL carry an ordered list of allowed string options that the user can add, edit, remove, and view. The generated schema SHALL represent an enum property as a string constrained to its options, using the standard JSON Schema `enum` keyword alongside `type: "string"`.

#### Scenario: Add an enum property

- **WHEN** the user adds a property named `status` with type enum and options `draft` and `published`
- **THEN** the generated schema includes `status` with `type` set to `string` and `enum` set to `["draft", "published"]`

#### Scenario: Enum as an array item type

- **WHEN** the user selects enum as an array's item type with options `a` and `b`
- **THEN** the generated schema represents the array's `items` as a string constrained to `["a", "b"]`

#### Scenario: Change a property to enum

- **WHEN** the user changes an existing property's type to enum
- **THEN** the property starts with no options and the user can add options to it

#### Scenario: Change an enum property to another type

- **WHEN** the user changes an enum property to another type
- **THEN** its options are discarded and the generated schema no longer contains an `enum` for that property

#### Scenario: Reload a saved enum property

- **WHEN** a saved schema contains a `string` property that declares an `enum` array of strings and the user loads it into the builder
- **THEN** the builder shows that property with type enum and the same options in the same order

#### Scenario: Import from sample JSON does not infer enums

- **WHEN** the user generates a schema from a sample JSON document
- **THEN** string values are inferred as `string` properties, not enum properties

### Requirement: Validate enum options

The system SHALL treat a schema as invalid while any enum property has no options, has an option that is empty after trimming, or has duplicate options, and SHALL tell the user which property needs correcting. Saving such a schema SHALL be blocked.

#### Scenario: Enum with no options

- **WHEN** a schema contains an enum property with no options
- **THEN** the builder reports that the property needs at least one option and does not allow saving

#### Scenario: Blank option

- **WHEN** an enum property contains an option that is empty or only whitespace
- **THEN** the builder reports the property as invalid and does not allow saving

#### Scenario: Duplicate options

- **WHEN** an enum property contains the same option twice
- **THEN** the builder reports the property as invalid and does not allow saving
