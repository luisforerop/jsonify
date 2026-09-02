## MODIFIED Requirements

### Requirement: Manage form entries through a persistence boundary

The system SHALL expose create, read, update, and delete operations for saved form entries through external client-side hooks. The form-filler interface SHALL use those hooks rather than accessing browser localStorage directly, and SHALL limit the entries it displays to those whose source schema belongs to the active project. The hook implementation SHALL persist form entries in a project-local JSON file through the server, and its create, read, update, and delete operations SHALL be asynchronous. A saved form entry SHALL remain available after the browser page is reloaded, including from a different browser or machine using the same server.

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
