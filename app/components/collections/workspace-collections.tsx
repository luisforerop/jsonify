"use client";

import Link from "next/link";

import { CollectionManager } from "@/app/components/collections/collection-manager";
import { ScopedGate } from "@/app/components/collections/scoped-gate";
import { Breadcrumb } from "@/app/components/shared/breadcrumb";
import { ApiKeysManager } from "@/app/components/workspaces/api-keys-manager";
import { useScopedCollection } from "@/hooks/use-scoped-collection";

type WorkspaceCollectionsProps = {
  workspaceSlug: string;
};

export function WorkspaceCollections({
  workspaceSlug,
}: WorkspaceCollectionsProps) {
  const { status, workspace } = useScopedCollection(workspaceSlug);

  return (
    <ScopedGate status={status}>
      {workspace && (
        <main className="workspace-shell">
          <header className="topbar">
            <div className="brand-lockup">
              <span className="brand-mark" aria-hidden="true">
                {}
              </span>
              <Breadcrumb
                workspaceSlug={workspace.slug}
                workspaceName={workspace.name}
              />
            </div>
            <div className="topbar-actions">
              <Link className="button button-secondary" href="/workspaces">
                All workspaces
              </Link>
            </div>
          </header>
          <CollectionManager workspace={workspace} />
          <ApiKeysManager workspaceId={workspace.id} />
        </main>
      )}
    </ScopedGate>
  );
}
