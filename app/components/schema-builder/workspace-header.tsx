import Link from "next/link";

import { Breadcrumb } from "@/app/components/shared/breadcrumb";
import type { Collection } from "@/hooks/use-collections";
import type { Workspace } from "@/hooks/use-workspaces";

type WorkspaceHeaderProps = {
  workspace: Workspace;
  collection: Collection;
  isEditing: boolean;
  mode: "editor" | "import";
  onToggleMode: () => void;
  onNewSchema: () => void;
  onSaveSchema: () => void;
};

export function WorkspaceHeader({
  workspace,
  collection,
  isEditing,
  mode,
  onToggleMode,
  onNewSchema,
  onSaveSchema,
}: WorkspaceHeaderProps) {
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
          currentView="Schemas"
        />
      </div>
      <div className="topbar-actions">
        {isEditing && (
          <span className="editing-indicator">Editing saved schema</span>
        )}
        <Link
          className="button button-secondary"
          href={`/w/${workspace.slug}/${collection.slug}/form-filler`}
        >
          Fill a form
        </Link>
        <button
          className="button button-secondary"
          type="button"
          onClick={onToggleMode}
        >
          {mode === "import" ? "Back to editor" : "From JSON"}
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={onNewSchema}
        >
          New schema
        </button>
        <button
          className="button button-primary"
          type="button"
          onClick={onSaveSchema}
        >
          Save schema
        </button>
      </div>
    </header>
  );
}
