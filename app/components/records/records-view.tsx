"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Breadcrumb } from "@/app/components/shared/breadcrumb";
import { RecordDetailDialog } from "@/app/components/records/record-detail-dialog";
import { RecordsTable } from "@/app/components/records/records-table";
import { ScopedGate } from "@/app/components/collections/scoped-gate";
import { useRecordsPage } from "@/hooks/use-records-page";
import type { SavedRecord } from "@/hooks/use-records";
import { useSavedSchemas } from "@/hooks/use-saved-schemas";
import { useScopedCollection } from "@/hooks/use-scoped-collection";
import { deriveColumns } from "@/lib/records-table";

const PAGE_SIZES = [10, 25, 50];
const DEFAULT_PAGE_SIZE = 25;

type RecordsViewProps = {
  workspaceSlug: string;
  collectionSlug: string;
};

function parsePositive(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}

export function RecordsView({ workspaceSlug, collectionSlug }: RecordsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status, workspace, collection } = useScopedCollection(
    workspaceSlug,
    collectionSlug,
  );
  const { schemas } = useSavedSchemas(collection?.id);

  const requestedSize = parsePositive(
    searchParams.get("pageSize"),
    DEFAULT_PAGE_SIZE,
  );
  const pageSize = PAGE_SIZES.includes(requestedSize)
    ? requestedSize
    : DEFAULT_PAGE_SIZE;
  const page = parsePositive(searchParams.get("page"), 1);
  const schemaId = searchParams.get("schema") ?? "";

  const { rows, total, error, isLoading, isLoaded, refetch, remove } =
    useRecordsPage({
      collectionId: collection?.id,
      schemaId: schemaId || undefined,
      page,
      pageSize,
    });
  const [selected, setSelected] = useState<SavedRecord | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function navigate(next: { page?: number; pageSize?: number; schema?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const merged = {
      page: next.page ?? page,
      pageSize: next.pageSize ?? pageSize,
      schema: next.schema ?? schemaId,
    };
    if (merged.page > 1) params.set("page", String(merged.page));
    else params.delete("page");
    if (merged.pageSize !== DEFAULT_PAGE_SIZE) {
      params.set("pageSize", String(merged.pageSize));
    } else {
      params.delete("pageSize");
    }
    if (merged.schema) params.set("schema", merged.schema);
    else params.delete("schema");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  // Deleting the last row of a page (or a stale deep link) lands past the end:
  // step back to the last page that exists.
  useEffect(() => {
    if (isLoaded && !isLoading && !error && page > totalPages) {
      navigate({ page: totalPages });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isLoading, error, page, totalPages]);

  const schemaNames = useMemo(
    () => Object.fromEntries(schemas.map((schema) => [schema.id, schema.name])),
    [schemas],
  );
  const selectedSchema = schemas.find((schema) => schema.id === schemaId) ?? null;
  const columns = useMemo(
    () =>
      deriveColumns(
        selectedSchema ? selectedSchema.schema : null,
        rows.map((row) => row.payload),
      ),
    [selectedSchema, rows],
  );

  async function handleDelete(record: SavedRecord): Promise<boolean> {
    return remove(record.id);
  }

  return (
    <ScopedGate status={status}>
      {workspace && collection && (
        <main className="workspace-shell">
          <header className="topbar">
            <div className="brand-lockup">
              <span className="brand-mark" aria-hidden="true">
                {}
              </span>
              <Breadcrumb
                workspaceSlug={workspace.slug}
                workspaceName={workspace.name}
                collectionSlug={collection.slug}
                collectionName={collection.name}
              />
            </div>
            <div className="topbar-actions">
              <Link
                className="button button-secondary"
                href={`/w/${workspace.slug}/${collection.slug}`}
              >
                Back to collection
              </Link>
            </div>
          </header>

          <div className="projects-grid">
            <section className="builder-panel" aria-labelledby="records-title">
              <div className="builder-heading">
                <div>
                  <p className="eyebrow">Records</p>
                  <h1 id="records-title">{collection.name}</h1>
                </div>
              </div>

              <div className="records-toolbar">
                <label>
                  <span className="status-copy">Schema </span>
                  <select
                    value={schemaId}
                    onChange={(event) =>
                      navigate({ schema: event.target.value, page: 1 })
                    }
                  >
                    <option value="">All schemas</option>
                    {schemas.map((schema) => (
                      <option key={schema.id} value={schema.id}>
                        {schema.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="status-copy">Per page </span>
                  <select
                    value={pageSize}
                    onChange={(event) =>
                      navigate({ pageSize: Number(event.target.value), page: 1 })
                    }
                  >
                    {PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {error && (
                <div role="alert">
                  <p className="status-copy">{error}</p>
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => void refetch()}
                  >
                    Retry
                  </button>
                </div>
              )}

              {!error && !isLoaded && (
                <p className="status-copy">Loading records...</p>
              )}

              {!error && isLoaded && total === 0 && (
                <p className="status-copy">
                  There are no records yet.{" "}
                  <Link href={`/w/${workspace.slug}/${collection.slug}/form-filler`}>
                    Create one in the form filler
                  </Link>
                  .
                </p>
              )}

              {isLoaded && rows.length > 0 && (
                <div className={isLoading ? "records-loading" : undefined}>
                  <RecordsTable
                    rows={rows}
                    columns={columns}
                    schemaNames={schemaNames}
                    showSchemaColumn={!selectedSchema}
                    onOpen={setSelected}
                  />
                </div>
              )}

              {isLoaded && !error && total > 0 && (
                <nav className="records-pagination" aria-label="Pagination">
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={page <= 1}
                    onClick={() => navigate({ page: page - 1 })}
                  >
                    Previous
                  </button>
                  <span className="status-copy">
                    Page {Math.min(page, totalPages)} of {totalPages} · {total}{" "}
                    {total === 1 ? "record" : "records"}
                  </span>
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={page >= totalPages}
                    onClick={() => navigate({ page: page + 1 })}
                  >
                    Next
                  </button>
                </nav>
              )}
            </section>
          </div>

          {selected && (
            <RecordDetailDialog
              record={selected}
              schemaName={schemaNames[selected.schemaId] ?? "Unknown schema"}
              onClose={() => setSelected(null)}
              onDelete={handleDelete}
            />
          )}
        </main>
      )}
    </ScopedGate>
  );
}
