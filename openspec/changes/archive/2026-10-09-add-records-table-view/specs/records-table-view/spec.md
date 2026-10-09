## Purpose

Lets users browse all records saved in a collection, or for one of its schemas, in a paginated table, including a readable way to see nested objects and arrays inside cells.

## ADDED Requirements

### Requirement: Open a collection's records table

The system SHALL provide a records table view for each collection, reachable at `/w/<workspaceSlug>/<collectionSlug>/records` and from the collection's page. The view SHALL show only records belonging to that collection and SHALL be available only to users who can open that collection.

#### Scenario: Open the table from a collection

- **WHEN** the user selects the records link on a collection's page
- **THEN** the system shows the records table scoped to that collection and workspace

#### Scenario: Unknown collection

- **WHEN** the user opens the records URL for a collection that is not available to them
- **THEN** the system shows a not-found state rather than an empty table

#### Scenario: Collection with no records

- **WHEN** the collection has no saved records
- **THEN** the table shows an empty state indicating there are no records yet and links to the form-filler

### Requirement: Paginate records on the server

The system SHALL return records for the table one page at a time, ordered by creation time with the newest first and a stable tie-break, so the client never needs to download every record. The user SHALL be able to move to the next and previous page and to choose a page size from a fixed set. The view SHALL show the current page, the total number of matching records, and SHALL disable previous/next when no such page exists. A page request beyond the last page SHALL return an empty page without error.

#### Scenario: First page

- **WHEN** the user opens the table for a collection with more records than the page size
- **THEN** only the first page of records is shown, newest first, with the total count and a next-page control enabled

#### Scenario: Navigate pages

- **WHEN** the user moves to the next page
- **THEN** the table shows the following records with no record repeated or skipped relative to the previous page

#### Scenario: Change page size

- **WHEN** the user selects a different page size
- **THEN** the table returns to the first page and shows that many records per page

#### Scenario: Last page boundaries

- **WHEN** the user is on the last page
- **THEN** the next-page control is disabled

### Requirement: Filter the table by schema

The system SHALL let the user narrow the table to the records of a single schema of the collection, with "all schemas" as the default. Changing the filter SHALL return the table to the first page and the total count SHALL reflect the filter.

#### Scenario: Filter to one schema

- **WHEN** the user selects a schema from the filter
- **THEN** only records saved with that schema are listed and the total count matches them

#### Scenario: Clear the filter

- **WHEN** the user returns the filter to "all schemas"
- **THEN** records of every schema in the collection are listed

### Requirement: Derive columns from the data

When a schema is selected, the table SHALL show one column per top-level property of that schema, in schema order. When all schemas are shown, the table SHALL show a schema-name column and one column per top-level key found in the records of the current page. In both cases the table SHALL also show created and last-updated columns. A record lacking a value for a column SHALL show an empty cell, distinguishable from an explicit `null` or empty string.

#### Scenario: Columns follow the selected schema

- **WHEN** the user filters by a schema with properties `name`, `age`, and `tags`
- **THEN** the table has columns `name`, `age`, `tags`, created, and updated

#### Scenario: Missing value

- **WHEN** a record has no value for a displayed column
- **THEN** that cell renders as empty and not as the text "null"

### Requirement: Render primitive values in cells

The system SHALL render strings, numbers, and booleans as readable text, `null` as a distinct muted marker, and SHALL truncate long text in the cell while keeping the full text available on demand.

#### Scenario: Long string

- **WHEN** a string value exceeds the cell's display width
- **THEN** the cell shows a truncated form and the full text is reachable without leaving the table

### Requirement: Render nested objects and arrays in cells

The system SHALL render array and object values in cells as a compact summary that does not enlarge the row, and SHALL let the user reveal the full value in place or in a detail view. An array SHALL be summarised by its item count and a preview of its first items (for arrays of primitives) or by its item count alone (for arrays of objects). An object SHALL be summarised by its key count and a preview of its first key/value pairs. An empty array or object SHALL render as an explicit empty marker. Revealing the full value SHALL show it as a formatted, indented structure and SHALL NOT alter the stored record.

#### Scenario: Array of primitives

- **WHEN** a cell value is `["a", "b", "c", "d"]`
- **THEN** the cell shows an item count and a preview of the leading items, and the full list is available to expand

#### Scenario: Array of objects

- **WHEN** a cell value is an array of objects
- **THEN** the cell shows the item count and the full structure is available to expand

#### Scenario: Nested object

- **WHEN** a cell value is an object with several keys
- **THEN** the cell shows the key count and a preview of the first pairs, and the full object is available to expand

#### Scenario: Empty containers

- **WHEN** a cell value is `[]` or `{}`
- **THEN** the cell renders an explicit empty marker

#### Scenario: Expanding does not change data

- **WHEN** the user expands and collapses a nested value
- **THEN** the record's stored payload is unchanged

### Requirement: Act on a row's record

The system SHALL let the user open the full record from the table, showing its complete payload and metadata, and SHALL provide delete for that record with confirmation.

#### Scenario: Open a record

- **WHEN** the user selects a row
- **THEN** the full payload is shown as a formatted structure with its schema name and timestamps

#### Scenario: Delete a record from the table

- **WHEN** the user confirms deletion of a record
- **THEN** the record is removed, the table refreshes, and the total count decreases by one

### Requirement: Surface loading and error states

While a page is loading the table SHALL indicate loading without discarding the previously shown rows abruptly. If a page cannot be loaded the view SHALL show an error and a retry action and SHALL NOT show a misleading empty state.

#### Scenario: Server unreachable

- **WHEN** loading a page fails
- **THEN** the view shows an error with a retry control instead of the empty state
