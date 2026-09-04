"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiExamplePanel } from "@/app/components/collections/api-example-panel";
import { Breadcrumb } from "@/app/components/shared/breadcrumb";
import { ScopedGate } from "@/app/components/collections/scoped-gate";
import { useCollections } from "@/hooks/use-collections";
import { useRecords } from "@/hooks/use-records";
import { useSavedSchemas } from "@/hooks/use-saved-schemas";
import { useScopedCollection } from "@/hooks/use-scoped-collection";

type CollectionViewProps = {
  workspaceSlug: string;
  collectionSlug: string;
};

export function CollectionView({
  workspaceSlug,
  collectionSlug,
}: CollectionViewProps) {
  const router = useRouter();
  const { status, workspace, collection } = useScopedCollection(
    workspaceSlug,
    collectionSlug,
  );
  const { update: updateCollection, remove: removeCollection } =
    useCollections(workspace?.id);
  const { schemas, remove: removeSchema } = useSavedSchemas(collection?.id);
  const { records, remove: removeRecord } = useRecords(collection?.id);
  const [showApiExample, setShowApiExample] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");

  function startRename(): void {
    if (!collection) return;
    setDraftName(collection.name);
    setIsRenaming(true);
  }

  async function confirmRename(): Promise<void> {
    if (!collection || !workspace) return;
    const trimmed = draftName.trim();
    if (trimmed) {
      await updateCollection(collection.id, {
        name: trimmed,
        workspaceId: workspace.id,
      });
    }
    setIsRenaming(false);
  }

  async function toggleVisibility(isPublic: boolean): Promise<void> {
    if (!collection || !workspace) return;
    await updateCollection(collection.id, {
      name: collection.name,
      workspaceId: workspace.id,
      isPublic,
    });
  }

  async function handleDelete(): Promise<void> {
    if (!collection || !workspace) return;
    await Promise.all([
      ...records.map((record) => removeRecord(record.id)),
      ...schemas.map((schema) => removeSchema(schema.id)),
    ]);
    if (await removeCollection(collection.id)) {
      router.push(`/w/${workspace.slug}`);
    }
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
              <Link className="button button-secondary" href={`/w/${workspace.slug}`}>
                All collections
              </Link>
            </div>
          </header>

          <div className="projects-grid">
            <section className="builder-panel" aria-labelledby="collection-title">
              <div className="builder-heading">
                <div>
                  <p className="eyebrow">Collection</p>
                  <h1 id="collection-title">{collection.name}</h1>
                </div>
              </div>
              <p className="status-copy">
                {collection.description ||
                  "Build and save JSON Schemas, then fill them in as forms, all scoped to this collection."}
              </p>

              <div className="collection-settings">
                <label className="required-field">
                  <input
                    type="checkbox"
                    checked={collection.isPublic === true}
                    onChange={(event) => toggleVisibility(event.target.checked)}
                  />
                  <span>Public</span>
                </label>
                {isRenaming ? (
                  <form
                    className="collection-rename-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void confirmRename();
                    }}
                  >
                    <input
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      onBlur={() => void confirmRename()}
                      autoFocus
                    />
                  </form>
                ) : (
                  <button className="text-button" type="button" onClick={startRename}>
                    Rename
                  </button>
                )}
                <button
                  className="delete-button"
                  type="button"
                  onClick={() => void handleDelete()}
                  aria-label={`Delete ${collection.name}`}
                  title={`Delete ${collection.name}`}
                >
                  Delete
                </button>
              </div>

              <div className="properties-heading">
                <div>
                  <h2>Continue in this collection</h2>
                  <p>Jump into the schema-builder or the form-filler.</p>
                </div>
              </div>
              <div className="topbar-actions">
                <Link
                  className="button button-primary"
                  href={`/w/${workspace.slug}/${collection.slug}/schema-builder`}
                >
                  Schema builder
                </Link>
                <Link
                  className="button button-outline"
                  href={`/w/${workspace.slug}/${collection.slug}/form-filler`}
                >
                  Form filler
                </Link>
                <button
                  className="button button-outline"
                  type="button"
                  onClick={() => setShowApiExample((current) => !current)}
                  aria-expanded={showApiExample}
                >
                  {showApiExample ? "Hide API example" : "API example"}
                </button>
              </div>
              {showApiExample && (
                <ApiExamplePanel
                  workspaceId={workspace.id}
                  collectionSlug={collection.slug}
                />
              )}
            </section>
          </div>
        </main>
      )}
    </ScopedGate>
  );
}
