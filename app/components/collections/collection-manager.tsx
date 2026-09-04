"use client";

import { useState } from "react";

import { CollectionsPanel } from "@/app/components/collections/collections-panel";
import { NewCollectionForm } from "@/app/components/collections/new-collection-form";
import { useCollections } from "@/hooks/use-collections";
import type { Workspace } from "@/hooks/use-workspaces";

type CollectionManagerProps = {
  workspace: Workspace;
};

export function CollectionManager({ workspace }: CollectionManagerProps) {
  const { collections, error, isLoaded, create } = useCollections(workspace.id);
  const [notice, setNotice] = useState<string | null>(null);

  async function createCollection(
    name: string,
    description: string,
  ): Promise<boolean> {
    setNotice(null);
    const collection = await create({
      name,
      workspaceId: workspace.id,
      description: description || undefined,
    });
    if (collection) {
      setNotice(`Created "${collection.name}".`);
      return true;
    }
    return false;
  }

  return (
    <div className="projects-grid">
      <NewCollectionForm
        persistenceError={error}
        notice={notice}
        disabled={false}
        onCreate={createCollection}
      />
      <CollectionsPanel
        collections={collections}
        workspaceSlug={workspace.slug}
        isLoaded={isLoaded}
      />
    </div>
  );
}
