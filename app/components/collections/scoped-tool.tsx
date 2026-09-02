"use client";

import type { ReactNode } from "react";

import { ScopedGate } from "@/app/components/collections/scoped-gate";
import { useScopedCollection } from "@/hooks/use-scoped-collection";
import type { Collection } from "@/hooks/use-collections";
import type { Workspace } from "@/hooks/use-workspaces";

type ScopedToolProps = {
  workspaceSlug: string;
  collectionSlug: string;
  children: (context: {
    workspace: Workspace;
    collection: Collection;
  }) => ReactNode;
};

/**
 * Resolves the `/w/[workspaceSlug]/[collectionSlug]` slugs for a tool page and
 * renders `children` with the concrete workspace and collection once both are
 * known, or the appropriate fallback while they are not.
 */
export function ScopedTool({
  workspaceSlug,
  collectionSlug,
  children,
}: ScopedToolProps) {
  const { status, workspace, collection } = useScopedCollection(
    workspaceSlug,
    collectionSlug,
  );

  return (
    <ScopedGate status={status}>
      {workspace && collection ? children({ workspace, collection }) : null}
    </ScopedGate>
  );
}
