"use client";

import { useState } from "react";

import { CollectionsPanel } from "@/app/components/collections/collections-panel";
import { NewCollectionForm } from "@/app/components/collections/new-collection-form";
import { useCollections } from "@/hooks/use-collections";
import { useRecords } from "@/hooks/use-records";
import { useSavedSchemas } from "@/hooks/use-saved-schemas";
import type { Workspace } from "@/hooks/use-workspaces";

type CollectionManagerProps = {
  workspace: Workspace;
};

export function CollectionManager({ workspace }: CollectionManagerProps) {
  const { collections, error, isLoaded, create, update, remove } =
    useCollections(workspace.id);
  const { schemas: allSchemas, remove: removeSchema } = useSavedSchemas();
  const { records: allRecords, remove: removeRecord } = useRecords();
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

  async function renameCollection(id: string, name: string): Promise<void> {
    await update(id, { name, workspaceId: workspace.id });
  }

  async function deleteCollection(id: string): Promise<void> {
    setNotice(null);
    const collectionSchemas = allSchemas.filter(
      (schema) => schema.collectionId === id,
    );

    await Promise.all([
      ...allRecords
        .filter((record) => record.collectionId === id)
        .map((record) => removeRecord(record.id)),
      ...collectionSchemas.map((schema) => removeSchema(schema.id)),
    ]);

    if (await remove(id)) setNotice("Collection deleted.");
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
        onRenameCollection={renameCollection}
        onDeleteCollection={deleteCollection}
      />
    </div>
  );
}
