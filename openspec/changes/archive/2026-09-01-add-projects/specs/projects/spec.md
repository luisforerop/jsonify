## Purpose

Lets users group related JSON Schemas and form entries into named projects, starting from a home screen where they create or open a project before working in the schema-builder or form-filler.

## ADDED Requirements

### Requirement: Create a project

The system SHALL allow a user to create a new project by entering a name from the home screen.

#### Scenario: Create a project with a name

- **WHEN** the user enters a name and confirms creating a new project
- **THEN** the system creates a project with that name and it appears in the projects list

#### Scenario: Reject an unnamed project

- **WHEN** the user attempts to create a project without entering a name
- **THEN** the system reports that a name is required and does not create a project

### Requirement: List and open projects

The system SHALL display the user's saved projects on the home screen and SHALL let the user open one to enter its workspace.

#### Scenario: View saved projects

- **WHEN** the home screen becomes available
- **THEN** it obtains the saved project collection through the persistence hook and displays each project by name

#### Scenario: Open a project

- **WHEN** the user selects a project from the list
- **THEN** the system enters that project's workspace, making it the active project for the schema-builder and form-filler

#### Scenario: No projects yet

- **WHEN** the home screen has no saved projects
- **THEN** it indicates there are no projects yet and prompts the user to create one

### Requirement: Rename a project

The system SHALL allow a user to rename an existing project.

#### Scenario: Rename an existing project

- **WHEN** the user edits a project's name and confirms the change
- **THEN** the system updates that project's name through the persistence hook without creating a duplicate project

### Requirement: Delete a project and its associated data

The system SHALL allow a user to delete a project. Deleting a project SHALL also delete the saved schemas and form entries associated with that project, since they have no meaning without their owning project.

#### Scenario: Delete a project

- **WHEN** the user deletes a project
- **THEN** the system removes the project, its saved schemas, and its form entries through their respective persistence hooks, and the project no longer appears in the projects list

#### Scenario: Deleting the active project

- **WHEN** the user deletes the project that is currently active
- **THEN** the system returns to the home screen, since there is no longer an active project

### Requirement: Navigate within a project's workspace

The system SHALL let a user navigate from an open project to that project's schema-builder and to its form-filler without leaving the project context.

#### Scenario: Access schema-builder and form-filler from a project

- **WHEN** the user is inside an open project
- **THEN** the interface lets them navigate to that project's schema-builder and to its form-filler, both scoped to that project

### Requirement: Manage projects through a persistence boundary

The system SHALL expose create, read, update, and delete operations for saved projects through external client-side hooks. The home screen SHALL use those hooks rather than accessing browser localStorage directly. The initial hook implementation SHALL persist projects in browser localStorage, and a saved project SHALL remain available after the browser page is reloaded in the same browser profile.

#### Scenario: Reload after creating a project

- **WHEN** the user reloads the application after creating a project
- **THEN** the saved project remains available through the persistence hook
