## 1. Paginated records data access

- [x] 1.1 Add `listPageByCollection(collectionId, { schemaId?, limit, offset })` returning `{ rows, total }` to `RecordRepository` (ordered `createdAt DESC, id DESC`)
- [x] 1.2 Implement it in the Drizzle repository and in the test fakes (`lib/server/repositories/testing.ts`)
- [x] 1.3 Extend `GET /api/records` with `collectionId`, `schemaId`, `page`, `pageSize` params (clamp `pageSize` to 100, out-of-range page → empty page); keep unpaginated behaviour when `page` is absent
- [x] 1.4 Verify the requested collection belongs to a workspace the session user can access before returning rows; audit the existing unpaginated path for the same check
- [x] 1.5 Add repository and route tests (ordering, schema filter, total, last/out-of-range page, unauthorized collection)

## 2. Cell rendering logic

- [x] 2.1 Implement pure `describeCell(value)` (empty, null, primitive, empty container, primitive array, object array, object) in `lib/`
- [x] 2.2 Implement column derivation (selected schema → schema properties; all schemas → union of page keys) in `lib/`
- [x] 2.3 Unit tests for `describeCell` and column derivation, including missing vs `null` vs empty string

## 3. Client hook

- [x] 3.1 Add `useRecordsPage({ collectionId, schemaId, page, pageSize })` returning `{ rows, total, error, isLoading, refetch }`
- [x] 3.2 Keep previous rows visible while the next page loads; surface fetch errors without showing the empty state

## 4. UI components

- [x] 4.1 `JsonTree` collapsible, read-only recursive component (initial depth 1)
- [x] 4.2 `CellValue` component rendering the `describeCell` result (chips, counts, muted null/empty, ellipsis with `title`)
- [x] 4.3 `RecordsTable` with derived columns, created/updated columns, expandable sub-row showing `JsonTree`, horizontal scroll container
- [x] 4.4 Pagination controls (previous/next, page size 10/25/50, "page X · N records"), schema filter select
- [x] 4.5 Record detail dialog/drawer with full payload, schema name, timestamps, and delete with confirmation
- [x] 4.6 Empty state (link to form-filler), error state with retry
- [x] 4.7 Table, chip, and tree styles in `app/globals.css` consistent with existing classes

## 5. Routing and navigation

- [x] 5.1 Add `app/w/[workspaceSlug]/[collectionSlug]/records/page.tsx` using the scoped gate and `useScopedCollection` (check `node_modules/next/dist/docs/` for current page/params conventions first)
- [x] 5.2 Sync page, page size, and schema filter with URL search params
- [x] 5.3 Add a "Records" link on the collection page (`collection-view.tsx`) next to schema-builder and form-filler
- [x] 5.4 After delete, refetch and step back one page if the current page becomes empty

## 6. Verification

- [x] 6.1 Manual check in the browser: pagination, schema filter, arrays/objects/empty/null cells, row expand, delete, unknown-collection not-found
- [x] 6.2 Run the test suite (`nvm use 22.23.2` then `npx vitest run`) and the type check/lint when ready
