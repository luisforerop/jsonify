import Link from "next/link";

type FormFillerHeaderProps = {
  isEditingEntry: boolean;
  onNewEntry: () => void;
};

export function FormFillerHeader({
  isEditingEntry,
  onNewEntry,
}: FormFillerHeaderProps) {
  return (
    <header className="topbar">
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true">
          {}
        </span>
        <span>Jsonify</span>
      </div>
      <div className="topbar-actions">
        {isEditingEntry && (
          <span className="editing-indicator">Editing saved entry</span>
        )}
        <Link className="button button-secondary" href="/">
          Schema builder
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
