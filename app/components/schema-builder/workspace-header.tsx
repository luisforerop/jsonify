import Link from "next/link";

import { Breadcrumb } from "@/app/components/shared/breadcrumb";

type WorkspaceHeaderProps = {
  projectId: string;
  projectName: string | null;
  isEditing: boolean;
  onNewSchema: () => void;
  onSaveSchema: () => void;
};

export function WorkspaceHeader({
  projectId,
  projectName,
  isEditing,
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
          projectId={projectId}
          projectName={projectName}
          currentView="Schemas"
        />
      </div>
      <div className="topbar-actions">
        {isEditing && (
          <span className="editing-indicator">Editing saved schema</span>
        )}
        <Link
          className="button button-secondary"
          href={`/projects/${projectId}/form-filler`}
        >
          Fill a form
        </Link>
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
