## RENAMED Requirements

- FROM: `### Requirement: Name a form entry for later identification`
- TO: `### Requirement: Name a record for later identification`

- FROM: `### Requirement: Manage form entries through a persistence boundary`
- TO: `### Requirement: Manage records through a persistence boundary`

- FROM: `### Requirement: Copy a saved form entry as JSON`
- TO: `### Requirement: Copy a record as JSON`

## MODIFIED Requirements

### Requirement: Load a saved schema into the form filler

The system SHALL let a user select one of the active collection's saved JSON
Schemas to load into the form-filler view.

#### Scenario: Load a saved schema

- **WHEN** the user selects a saved schema from the list
- **THEN** the form-filler view loads that schema and renders a form matching its structure

#### Scenario: No saved schemas available

- **WHEN** the user opens the form-filler view for a collection with no saved schemas
- **THEN** the view indicates there are no saved schemas to load and does not render a form

#### Scenario: Schema list scoped to the active project

- **WHEN** the active collection has saved schemas and other collections also have saved schemas
- **THEN** the form-filler's schema picker lists only the active collection's schemas

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

### Requirement: Name a record for later identification

The system SHALL let a user give a record a name before it is submitted, and
SHALL use that name to identify the record in the saved-records list so the user
can find and load it later.

#### Scenario: Require a name before saving

- **WHEN** the user submits a form without entering a name for the record
- **THEN** the interface reports that a name is required and does not create or update a record

#### Scenario: Identify saved entries by name

- **WHEN** the saved-records list is displayed
- **THEN** each record shows the name the user gave it instead of only the source schema's name

### Requirement: Manage records through a persistence boundary

The system SHALL expose create, read, update, and delete operations for records
through external client-side hooks. The form-filler interface SHALL use those
hooks rather than accessing browser localStorage directly, and SHALL limit the
records it displays to those belonging to the active collection. The hook
implementation SHALL persist records in a project-local JSON file through the
server, and its create, read, update, and delete operations SHALL be
asynchronous. A saved record SHALL remain available after the browser page is
reloaded, including from a different browser or machine using the same server.

#### Scenario: List saved form entries

- **WHEN** the form-filler view becomes available
- **THEN** it obtains the active collection's records through the persistence hook

#### Scenario: Edit a saved form entry

- **WHEN** the user loads a previously saved record and submits changed values
- **THEN** the interface updates that record through the persistence hook without creating a duplicate

#### Scenario: Delete a saved form entry

- **WHEN** the user deletes a saved record
- **THEN** the interface removes that record through the persistence hook and it no longer appears in the saved-records list

#### Scenario: Reload after submitting

- **WHEN** the user reloads the application after submitting a record
- **THEN** the saved record remains available through the persistence hook

#### Scenario: Entries are isolated per project

- **WHEN** two different collections each have records
- **THEN** the form-filler's saved-records list for one collection does not show the other collection's records

### Requirement: Copy a record as JSON

The system SHALL let a user copy a record's submitted values to the clipboard as
JSON directly from the saved-records list.

#### Scenario: Copy an entry's values

- **WHEN** the user selects the copy action for a saved record
- **THEN** the interface writes that record's values to the clipboard as formatted JSON and confirms the copy succeeded

#### Scenario: Clipboard copy fails

- **WHEN** the clipboard copy action does not succeed
- **THEN** the interface reports that the copy failed without altering the saved record
