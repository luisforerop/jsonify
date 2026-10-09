## Context

See proposal.md for motivation. Current state:

- `records` has `payload` (jsonb), `schemaId`, `collectionId`, timestamps; a GIN index on payload and an index on `collectionId`.
- `GET /api/records` returns every record in the system via `repositories.records.list()`; `useRecords(collectionId)` filters client-side. This cannot back a paginated table.
- The UI is hand-rolled React + global CSS (no shadcn, no table component). There are no server actions; data flows through API routes + hooks.
- Collection pages live at `app/w/[workspaceSlug]/[collectionSlug]/`, and scoped pages use `useScopedCollection` / scoped gate components.
- Schemas are `JsonSchema` trees (`type`, `properties`, `items`, `required`); payloads are validated by ajv on write.

## Goals / Non-Goals

**Goals:**
- Server-side paginated listing scoped to a collection, optionally a schema.
- A table whose cells stay one line tall even for nested values, with the full value one click away.

**Non-Goals:**
- Sorting by arbitrary columns, free-text search, per-column filters, inline editing, export (all follow-ups; the endpoint shape leaves room for them).
- Flattening nested payloads into relational columns.
- Relations / `x-relation` resolution (not in the repo yet).
- Virtualised rendering; page sizes are small (10/25/50).

## Decisions

### D1. Offset pagination, newest first

`listPageByCollection(collectionId, { schemaId?, limit, offset })` returns `{ rows, total }`, ordered by `createdAt DESC, id DESC`. Exposed as query params (`collectionId`, `schemaId`, `page`, `pageSize`) on the existing `GET /api/records`; when `page`/`pageSize` are absent the old unpaginated behaviour is kept so existing hooks do not break. `pageSize` is clamped (max 100).

Alternative: keyset (cursor) pagination. Better for huge, frequently-changing sets and avoids skipped/duplicated rows on concurrent inserts, but it prevents "jump to page N" and a total count is still wanted. Offset is simpler and fine at this scale; the `(createdAt, id)` ordering is already cursor-compatible if we switch later.

### D2. Columns

Selected schema → columns from its top-level `properties` (schema order). "All schemas" → schema-name column + union of top-level keys on the current page (first-seen order). Always append created/updated. Computed client-side from the returned page and the schema list; no server support needed.

### D3. How to show arrays and objects in cells — options

| | Option | Cell shows | Pros | Cons |
|---|---|---|---|---|
| A | **JSON text, truncated** | `{"street":"Main 1","city":"Bo…` | trivial, exact, no schema knowledge | noisy, unreadable for arrays of objects, truncation hides structure |
| B | **Summary + count badge** | `[4 items]`, `{3 keys}` | very compact, uniform row height, scannable | little information without interaction |
| C | **Preview chips** | arrays of primitives: `a` `b` `+2`; objects: `city: Bogotá · zip: 1100 …` | readable at a glance, still one line | needs truncation rules; wide for long values |
| D | **Expandable row (sub-row)** | summary in cell; chevron expands a full-width row under it showing the whole payload as a tree | full detail without leaving the table, can show all nested values of the record at once | rows change height; more state |
| E | **Popover / side drawer on click** | summary in cell; click opens popover (cell) or drawer (record) with formatted JSON / nested table | no layout shift; drawer fits whole-record view and actions | extra click, overlay a11y work |
| F | **Nested table / flattened columns** | arrays of objects → inner mini-table; objects → dotted columns `address.city` | tabular and sortable-friendly for shallow objects | explodes column count; varying shapes; deep nesting unmanageable; arrays can't flatten to columns |

**Decision: C + D, with E for the whole record.** Cells use a type-aware compact rendering (option C for arrays of primitives and objects; option B-style `N items` for arrays of objects and for deeply nested values). A chevron on the row expands a full-width sub-row (option D) showing the record's entire payload as an indented, collapsible tree. A "view record" action opens the same tree plus metadata and delete in a drawer/dialog (option E), which also hosts the long-text full view. Option F (flattening) is rejected for the default view because columns would vary per record; it can be offered later as an opt-in "flatten objects one level" toggle when a schema is selected. Option A is kept only as the fallback renderer for values the typed renderer cannot classify.

Rendering rules (pure function `describeCell(value)` returning a discriminated union, unit-testable without React):
- `undefined` → empty cell; `null` → muted `null`; string/number/boolean → text (strings truncated by CSS ellipsis, full text in `title` and in the detail view).
- `[]` / `{}` → muted `empty`.
- array of primitives → up to 3 chips + `+N`.
- array of objects/mixed → `N items`.
- object → `N keys` + up to 2 `key: value` primitive pairs; nested containers inside the preview shown as `{…}` / `[…]`.

### D4. Row detail tree

A small recursive `JsonTree` component (collapsible, depth-limited initial expansion to 1) is shared by the expanded sub-row and the detail dialog. Pure presentational; never mutates the payload.

### D5. State and URL

Page, page size, and schema filter live in the URL search params so the view is shareable and survives reload. A `useRecordsPage` hook fetches the page and exposes `{ rows, total, error, isLoading, refetch }`; delete calls the existing `DELETE /api/records/[id]` then refetches (stepping back a page if the current page becomes empty).

### D6. Authorization

The paginated path reuses the current Clerk-session check and must confirm the requested collection belongs to a workspace the user can access before returning rows (the existing unpaginated route should be audited for the same check as part of this work rather than assumed).

## Risks / Trade-offs

- [Offset pagination can skip/duplicate rows if records are inserted while paging] → acceptable for now; ordering is cursor-compatible if needed.
- [`COUNT(*)` on large collections is slow] → covered by the `collectionId` index at current scale; revisit with an estimated count or a composite `(collectionId, schemaId, createdAt)` index.
- [Union of keys is page-local in "all schemas" mode, so columns can change between pages] → documented behaviour; selecting a schema gives stable columns. Mitigation if it proves confusing: default to the first schema when the collection has only one.
- [Existing `GET /api/records` returns all records and may lack a per-collection authorization check] → audit during implementation (D6); keep its behaviour unchanged otherwise.
- [Wide payloads make the table scroll horizontally] → sticky first/last columns and horizontal scroll container; cell max-width with ellipsis.
