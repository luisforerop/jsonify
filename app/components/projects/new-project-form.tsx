import type { ChangeEvent } from "react";

type NewProjectFormProps = {
  name: string;
  nameMissing: boolean;
  persistenceError: string | null;
  notice: string | null;
  onNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
};

export function NewProjectForm({
  name,
  nameMissing,
  persistenceError,
  notice,
  onNameChange,
  onSubmit,
}: NewProjectFormProps) {
  return (
    <section className="builder-panel" aria-labelledby="new-project-title">
      <div className="builder-heading">
        <div>
          <p className="eyebrow">Projects</p>
          <h1 id="new-project-title">Start a new project</h1>
        </div>
      </div>
      <label className="schema-name-field">
        <span>Project name</span>
        <input
          value={name}
          onChange={onNameChange}
          placeholder="Customer onboarding"
        />
      </label>
      <div className="properties-heading">
        <div>
          <h2>Create project</h2>
          <p>
            Schemas you save, and the form entries filled from them, will
            belong to this project.
          </p>
        </div>
        <button
          className="button button-add"
          type="button"
          onClick={onSubmit}
        >
          Create project
        </button>
      </div>
      {(nameMissing || persistenceError || notice) && (
        <div className="feedback-area" aria-live="polite">
          {nameMissing && (
            <p className="feedback error">Enter a name for this project.</p>
          )}
          {persistenceError && (
            <p className="feedback error">{persistenceError}</p>
          )}
          {notice && <p className="feedback success">{notice}</p>}
        </div>
      )}
    </section>
  );
}
