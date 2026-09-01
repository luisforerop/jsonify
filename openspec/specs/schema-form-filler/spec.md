# Schema Form Filler Specification

## Purpose

Lets users pick a saved JSON Schema, fill in matching values through a generated form, and manage the resulting form submissions through persistence hooks.

## Requirements

### Requirement: Load a saved schema into the form filler

The system SHALL let a user select one of their active project's saved JSON Schemas to load into the form-filler view.

#### Scenario: Load a saved schema

- **WHEN** the user selects a saved schema from the list
- **THEN** the form-filler view loads that schema and renders a form matching its structure

#### Scenario: No saved schemas available

- **WHEN** the user opens the form-filler view for a project with no saved schemas
- **THEN** the view indicates there are no saved schemas to load and does not render a form

#### Scenario: Schema list scoped to the active project

- **WHEN** the active project has saved schemas and other projects also have saved schemas
- **THEN** the form-filler's schema picker lists only the active project's schemas

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

The system SHALL let a user submit filled-in values from the generated form and SHALL save the submitted data, associated with its source schema, through external persistence hooks.

#### Scenario: Submit a completed form

- **WHEN** the user submits a form with all required fields filled in
- **THEN** the interface creates a form-entry record through the persistence hook, associated with the loaded schema, and the user receives confirmation that it was saved

#### Scenario: Block submission with missing required fields

- **WHEN** the user submits a form while a required field is empty
- **THEN** the interface reports which fields are missing and does not create a form-entry record

### Requirement: Name a form entry for later identification

The system SHALL let a user give a saved form entry a name before it is submitted, and SHALL use that name to identify the entry in the saved-entries list so the user can find and load it later.

#### Scenario: Require a name before saving

- **WHEN** the user submits a form without entering a name for the entry
- **THEN** the interface reports that a name is required and does not create or update a form-entry record

#### Scenario: Identify saved entries by name

- **WHEN** the saved-entries list is displayed
- **THEN** each entry shows the name the user gave it instead of only the source schema's name

### Requirement: Manage form entries through a persistence boundary

The system SHALL expose create, read, update, and delete operations for saved form entries through external client-side hooks. The form-filler interface SHALL use those hooks rather than accessing browser localStorage directly, and SHALL limit the entries it displays to those whose source schema belongs to the active project. The initial hook implementation SHALL persist form entries in browser localStorage, and a saved form entry SHALL remain available after the browser page is reloaded in the same browser profile.

#### Scenario: List saved form entries

- **WHEN** the form-filler view becomes available
- **THEN** it obtains the saved form-entry collection through the persistence hook

#### Scenario: Edit a saved form entry

- **WHEN** the user loads a previously saved form entry and submits changed values
- **THEN** the interface updates that form entry through the persistence hook without creating a duplicate saved entry

#### Scenario: Delete a saved form entry

- **WHEN** the user deletes a saved form entry
- **THEN** the interface removes that entry through the persistence hook and it no longer appears in the saved collection

#### Scenario: Reload after submitting

- **WHEN** the user reloads the application after submitting a form entry
- **THEN** the saved form entry remains available through the persistence hook

#### Scenario: Entries are isolated per project

- **WHEN** two different projects each have schemas with saved form entries
- **THEN** the form-filler's saved-entries list for one project does not show the other project's entries

### Requirement: Copy a saved form entry as JSON

The system SHALL let a user copy a saved form entry's submitted values to the clipboard as JSON directly from the saved-entries list.

#### Scenario: Copy an entry's values

- **WHEN** the user selects the copy action for a saved form entry
- **THEN** the interface writes that entry's values to the clipboard as formatted JSON and confirms the copy succeeded

#### Scenario: Clipboard copy fails

- **WHEN** the clipboard copy action does not succeed
- **THEN** the interface reports that the copy failed without altering the saved entry
