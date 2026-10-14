## Purpose

Lets a workspace member share a schema's form through a public URL so someone without an account can submit a record, with an on/off switch that controls whether responses are accepted.

## ADDED Requirements

### Requirement: Public form URL keyed by schema id

The system SHALL expose, for every saved schema, a public URL of the form `/f/<schemaId>` that does not require authentication. Opening it while the schema is accepting responses SHALL render the form generated from that schema, and nothing else about the workspace or collection beyond the schema name.

#### Scenario: Open an enabled form link

- **WHEN** an unauthenticated visitor opens `/f/<schemaId>` for a schema whose sharing is on
- **THEN** the page renders the form for that schema and a submit action

#### Scenario: Unknown schema id

- **WHEN** a visitor opens `/f/<id>` where no schema has that id (or the id is malformed)
- **THEN** the page shows a not-found state and reveals nothing about other schemas

#### Scenario: No stored data is exposed

- **WHEN** a visitor opens an enabled form link for a collection that already has records
- **THEN** the page and its data requests never include any existing record

### Requirement: Toggle whether a schema accepts responses

Each schema SHALL have a sharing state that is off by default. Workspace members SHALL be able to turn it on and off at any time, and the state SHALL persist across reloads and restarts. Changing the state SHALL NOT change the URL.

#### Scenario: New schemas are not shared

- **WHEN** a schema is created
- **THEN** its sharing state is off and its public URL does not accept responses

#### Scenario: Member enables sharing

- **WHEN** a workspace member turns sharing on for a schema
- **THEN** the member sees the public URL with a way to copy it, and the URL starts accepting responses

#### Scenario: Member disables sharing

- **WHEN** a workspace member turns sharing off for a schema
- **THEN** the same URL stops accepting responses immediately and can be turned on again later

#### Scenario: Non-members cannot change the state

- **WHEN** a user who is not a member of the schema's workspace (or an unauthenticated caller) tries to change the sharing state
- **THEN** the change is rejected and the state is unchanged

### Requirement: Disabled form shows a closed state

While sharing is off, the public URL SHALL render a message that the form is not accepting responses and SHALL NOT render the form fields.

#### Scenario: Visit a disabled form link

- **WHEN** a visitor opens `/f/<schemaId>` for a schema whose sharing is off
- **THEN** the page shows a "not accepting responses" message and no form fields

#### Scenario: Form disabled while the page is open

- **WHEN** a visitor has the form open and the member turns sharing off before the visitor submits
- **THEN** the submission is rejected and the visitor is told the form is no longer accepting responses

### Requirement: Submit a response through the public form

The system SHALL accept an unauthenticated submission for a schema only while its sharing is on. The submitted payload SHALL be validated against the schema; a valid payload SHALL be stored as a new record in the schema's collection, linked to that schema, and a confirmation SHALL be shown to the visitor.

#### Scenario: Valid submission

- **WHEN** a visitor submits values that conform to the schema while sharing is on
- **THEN** a record with that payload is created in the schema's collection and the visitor sees a confirmation

#### Scenario: Invalid submission

- **WHEN** a visitor submits values that do not conform to the schema
- **THEN** the submission is rejected with the validation errors and no record is created

#### Scenario: Submission while disabled

- **WHEN** a submission arrives for a schema whose sharing is off
- **THEN** it is rejected and no record is created

#### Scenario: Submission to unknown schema

- **WHEN** a submission arrives for an id that matches no schema
- **THEN** it is rejected as not found and no record is created

#### Scenario: Oversized or non-object body

- **WHEN** a submission body is not a JSON object or exceeds the allowed size
- **THEN** it is rejected and no record is created

### Requirement: Public submissions are write-only

The public form flow SHALL only allow creating records. It SHALL NOT allow listing, reading, updating, or deleting records, and its responses SHALL NOT include any existing record's data (including the record it just created beyond its identifier).

#### Scenario: Only creation is available

- **WHEN** an unauthenticated client attempts to read, replace, or delete records through the public form endpoint
- **THEN** the request is rejected with a method-not-allowed response
