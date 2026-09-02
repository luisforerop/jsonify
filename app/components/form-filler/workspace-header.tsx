import Link from "next/link";

import { Breadcrumb } from "@/app/components/shared/breadcrumb";
import type { Collection } from "@/hooks/use-collections";
import type { Workspace } from "@/hooks/use-workspaces";

type FormFillerHeaderProps = {
  workspace: Workspace;
  collection: Collection;
  isEditingRecord: boolean;
  onNewRecord: () => void;
};

export function FormFillerHeader({
  workspace,
  collection,
  isEditingRecord,
  onNewRecord,
}: FormFillerHeaderProps) {
  return (
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
          currentView="Forms"
        />
      </div>
      <div className="topbar-actions">
        {isEditingRecord && (
          <span className="editing-indicator">Editing saved record</span>
        )}
        <Link
          className="button button-secondary"
          href={`/w/${workspace.slug}/${collection.slug}`}
        >
          Back to collection
        </Link>
        <button
          className="button button-secondary"
          type="button"
          onClick={onNewRecord}
        >
          New record
        </button>
      </div>
    </header>
  );
}
