## MODIFIED Requirements

### Requirement: Manage projects through a persistence boundary

The system SHALL expose create, read, update, and delete operations for saved projects through external client-side hooks. The home screen SHALL use those hooks rather than accessing browser localStorage directly. The hook implementation SHALL persist projects in a project-local JSON file through the server, and its create, read, update, and delete operations SHALL be asynchronous. A saved project SHALL remain available after the browser page is reloaded, including from a different browser or machine using the same server.

#### Scenario: Reload after creating a project

- **WHEN** the user reloads the application after creating a project
- **THEN** the saved project remains available through the persistence hook

#### Scenario: Project visible from another browser

- **WHEN** a project is created and the application is then opened in a different browser against the same server
- **THEN** the saved project is listed through the persistence hook

#### Scenario: Persistence backend is unavailable

- **WHEN** the persistence hook cannot reach the server to load or save projects
- **THEN** the hook surfaces an error state and does not silently discard the user's action
