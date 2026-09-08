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
