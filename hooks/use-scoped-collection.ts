"use client";

import { useEffect } from "react";

import { useCollections, type Collection } from "@/hooks/use-collections";
import { useWorkspaces, type Workspace } from "@/hooks/use-workspaces";
import { useSession } from "@/app/session-context";

export type ScopedCollectionStatus =
  | "no-user"
  | "loading"
  | "not-found"
  | "ready";

export type ScopedCollection = {
  status: ScopedCollectionStatus;
  workspace: Workspace | null;
  collection: Collection | null;
};

/**
 * Resolves the workspace (and optionally the collection) named by the slugs in
 * a `/w/[workspaceSlug]/[collectionSlug]` route against the active user's data,
 * and keeps the session's active workspace/collection in sync with the URL.
 */
export function useScopedCollection(
  workspaceSlug: string,
  collectionSlug?: string,
): ScopedCollection {
  const { currentUser, isUserLoaded, selectWorkspace, selectCollection } =
    useSession();
  const {
    workspaces,
    isLoaded: workspacesLoaded,
  } = useWorkspaces();
  const workspace =
    workspaces.find((candidate) => candidate.slug === workspaceSlug) ?? null;
  const {
    collections,
    isLoaded: collectionsLoaded,
  } = useCollections(workspace?.id);
  const collection =
    collectionSlug === undefined
      ? null
      : (collections.find((candidate) => candidate.slug === collectionSlug) ??
        null);

  useEffect(() => {
    selectWorkspace(workspace);
  }, [workspace, selectWorkspace]);

  useEffect(() => {
    selectCollection(collection);
  }, [collection, selectCollection]);

  let status: ScopedCollectionStatus = "ready";
  if (!isUserLoaded) {
    status = "loading";
  } else if (!currentUser) {
    status = "no-user";
  } else if (!workspacesLoaded || (workspace && !collectionsLoaded)) {
    status = "loading";
  } else if (!workspace) {
    status = "not-found";
  } else if (collectionSlug !== undefined && !collection) {
    status = "not-found";
  }

  return { status, workspace, collection };
}
