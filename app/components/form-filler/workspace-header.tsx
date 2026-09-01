import Link from "next/link";

import { Breadcrumb } from "@/app/components/shared/breadcrumb";

type FormFillerHeaderProps = {
  projectId: string;
  projectName: string | null;
  isEditingEntry: boolean;
  onNewEntry: () => void;
};

export function FormFillerHeader({
  projectId,
  projectName,
  isEditingEntry,
  onNewEntry,
}: FormFillerHeaderProps) {
  return (
    <header className="topbar">
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true">
          {}
        </span>
        <Breadcrumb
          projectId={projectId}
          projectName={projectName}
          currentView="Forms"
        />
      </div>
      <div className="topbar-actions">
        {isEditingEntry && (
          <span className="editing-indicator">Editing saved entry</span>
        )}
        <Link
          className="button button-secondary"
          href={`/projects/${projectId}`}
        >
          Back to project
        </Link>
        <button
          className="button button-secondary"
          type="button"
          onClick={onNewEntry}
        >
          New entry
        </button>
      </div>
    </header>
  );
}
