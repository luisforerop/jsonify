## ADDED Requirements

### Requirement: Persist per-schema sharing state

The system SHALL persist, for every saved schema, a boolean sharing state that defaults to off. Existing schemas present before the state was introduced SHALL read as off after migration, and updating the state SHALL refresh the schema's `updatedAt` without altering its identifier or definition.

#### Scenario: Existing schemas default to off

- **WHEN** the migration introducing the sharing state is applied to a database that already contains schemas
- **THEN** every existing schema reads as sharing off

#### Scenario: State survives a restart

- **WHEN** a schema's sharing state is turned on and the application restarts
- **THEN** the schema still reads as sharing on
