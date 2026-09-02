"use client";

import Link from "next/link";
import { useState } from "react";

import type { Collection } from "@/hooks/use-collections";

import { PanelHeading } from "@/app/components/schema-builder/panel-heading";

type CollectionsPanelProps = {
  collections: Collection[];
  workspaceSlug: string | null;
  isLoaded: boolean;
  onRenameCollection: (id: string, name: string) => void;
  onDeleteCollection: (id: string) => void;
};

export function CollectionsPanel({
  collections,
  workspaceSlug,
  isLoaded,
  onRenameCollection,
  onDeleteCollection,
}: CollectionsPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  function startRename(collection: Collection): void {
    setEditingId(collection.id);
    setDraftName(collection.name);
  }

  function confirmRename(id: string): void {
    const trimmed = draftName.trim();
    if (trimmed) onRenameCollection(id, trimmed);
    setEditingId(null);
  }

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
            {editingId === collection.id ? (
              <form
                className="rename-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  confirmRename(collection.id);
                }}
              >
                <input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  onBlur={() => confirmRename(collection.id)}
                  autoFocus
                />
              </form>
            ) : workspaceSlug ? (
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
            <div className="saved-item-actions">
              <button
                className="text-button"
                type="button"
                onClick={() => startRename(collection)}
              >
                Rename
              </button>
              <button
                className="delete-button"
                type="button"
                onClick={() => onDeleteCollection(collection.id)}
                aria-label={`Delete ${collection.name}`}
                title={`Delete ${collection.name}`}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
