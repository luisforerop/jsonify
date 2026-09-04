"use client";

import Link from "next/link";

import type { Collection } from "@/hooks/use-collections";

import { PanelHeading } from "@/app/components/schema-builder/panel-heading";

type CollectionsPanelProps = {
  collections: Collection[];
  workspaceSlug: string | null;
  isLoaded: boolean;
};

export function CollectionsPanel({
  collections,
  workspaceSlug,
  isLoaded,
}: CollectionsPanelProps) {
  return (
    <aside className="saved-panel" aria-label="Collections">
      <PanelHeading
        eyebrow="Workspace"
        title="Your collections"
        badge={String(collections.length)}
      />
      {!isLoaded && <p className="status-copy">Loading your collections...</p>}
      {isLoaded && collections.length === 0 && (
        <p className="status-copy">
          Create your first collection to start saving schemas.
        </p>
      )}
      <ul className="saved-list">
        {collections.map((collection) => (
          <li className="saved-item" key={collection.id}>
            {workspaceSlug ? (
              <Link
                className="saved-schema-button"
                href={`/w/${workspaceSlug}/${collection.slug}`}
              >
                <strong>{collection.name}</strong>
                <span>
                  {new Date(collection.updatedAt).toLocaleDateString()}
                </span>
              </Link>
            ) : (
              <span className="saved-schema-button">
                <strong>{collection.name}</strong>
                <span>
                  {new Date(collection.updatedAt).toLocaleDateString()}
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
