"use client";

import Link from "next/link";

import { Breadcrumb } from "@/app/components/shared/breadcrumb";
import { ScopedGate } from "@/app/components/collections/scoped-gate";
import { useScopedCollection } from "@/hooks/use-scoped-collection";

type CollectionViewProps = {
  workspaceSlug: string;
  collectionSlug: string;
};

export function CollectionView({
  workspaceSlug,
  collectionSlug,
}: CollectionViewProps) {
  const { status, workspace, collection } = useScopedCollection(
    workspaceSlug,
    collectionSlug,
  );

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
              </div>
            </section>
          </div>
        </main>
      )}
    </ScopedGate>
  );
}
