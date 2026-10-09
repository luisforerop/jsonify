## Why

Saved records can only be seen today as a short list in the form-filler's saved-entries panel, and the collection page only uses them for delete. There is no way to browse everything stored in a collection (or for one schema) at a glance, compare records side by side, or page through a large set. Records hold nested objects and arrays, so a flat list does not scale and a table needs a deliberate way to render those values.

## What Changes

- Add a records table view, reachable from a collection, that shows the records saved in that collection in a paginated table.
- Let the user narrow the table to a single schema of the collection (default: all schemas). When a schema is selected, columns derive from that schema's properties; when "all" is selected, columns are the union of top-level keys plus fixed columns (schema, created, updated).
- Add server-side pagination for records: a paginated list endpoint (page + page size, optional `schemaId` filter, stable ordering by `createdAt` desc) so the table does not download every record in the system (`GET /api/records` currently returns all records and filters on the client).
- Render nested values (objects and arrays) inside cells with a defined strategy (see design.md for the options evaluated): compact inline summary in the cell, with the full value reachable by expanding the row or opening a detail view.
- Add navigation from the collection page to the records table, and from a row to editing/deleting that record via existing flows.

## Capabilities

### New Capabilities
- `records-table-view`: paginated, schema-filterable table of a collection's records, including how nested objects/arrays are shown in cells.

### Modified Capabilities
- `projects`: the collection's navigation requirement gains a link to the records table alongside the schema-builder and form-filler.

## Impact

- UI: new route `app/w/[workspaceSlug]/[collectionSlug]/records/page.tsx` and table components under `app/components/records/`; a new link in `app/components/collections/collection-view.tsx`; table styles in `app/globals.css` (no table component or shadcn exists).
- API: new paginated listing on the internal records route (`app/api/records/route.ts`), backed by a new `RecordRepository` method (`listPageByCollection`) with Drizzle and test-fake implementations. The existing unpaginated `GET` stays for current consumers.
- Hooks: new `useRecordsPage` hook (page, pageSize, schemaId) in `hooks/`.
- No DB migration required: existing `records_collection` index and `createdAt` ordering suffice; revisit an index on `(collectionId, schemaId, createdAt)` if needed.
- No new dependencies planned (hand-rolled table, consistent with the rest of the UI).
