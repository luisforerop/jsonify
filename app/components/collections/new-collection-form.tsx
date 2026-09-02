"use client";

import { useState, type FormEvent } from "react";

type NewCollectionFormProps = {
  persistenceError: string | null;
  notice: string | null;
  disabled: boolean;
  onCreate: (name: string, description: string) => Promise<boolean>;
};

export function NewCollectionForm({
  persistenceError,
  notice,
  disabled,
  onCreate,
}: NewCollectionFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameMissing, setNameMissing] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const trimmed = name.trim();
    setNameMissing(!trimmed);
    if (!trimmed) return;
    if (await onCreate(trimmed, description.trim())) {
      setName("");
      setDescription("");
      setNameMissing(false);
    }
  }

  return (
    <section className="builder-panel" aria-labelledby="new-collection-title">
      <div className="builder-heading">
        <div>
          <p className="eyebrow">Collections</p>
          <h1 id="new-collection-title">Start a new collection</h1>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <label className="schema-name-field">
          <span>Collection name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Recetas"
            disabled={disabled}
          />
        </label>
        <label className="schema-name-field">
          <span>Description (optional)</span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What this collection holds"
            disabled={disabled}
          />
        </label>
        <div className="properties-heading">
          <div>
            <h2>Create collection</h2>
            <p>
              Schemas you save, and the records filled from them, will belong to
              this collection.
            </p>
          </div>
          <button
            className="button button-add"
            type="submit"
            disabled={disabled}
          >
            Create collection
          </button>
        </div>
      </form>
      {(nameMissing || persistenceError || notice || disabled) && (
        <div className="feedback-area" aria-live="polite">
          {disabled && (
            <p className="feedback error">
              Select a workspace before creating collections.
            </p>
          )}
          {nameMissing && (
            <p className="feedback error">Enter a name for this collection.</p>
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
