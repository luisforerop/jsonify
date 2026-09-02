"use client";

import { useState, type FormEvent } from "react";

import type { Workspace } from "@/hooks/use-workspaces";

import { PanelHeading } from "@/app/components/schema-builder/panel-heading";

type WorkspaceSelectorProps = {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  isLoaded: boolean;
  persistenceError: string | null;
  onSelectWorkspace: (workspace: Workspace) => void;
  onCreateWorkspace: (name: string) => Promise<boolean>;
};

export function WorkspaceSelector({
  workspaces,
  activeWorkspaceId,
  isLoaded,
  persistenceError,
  onSelectWorkspace,
  onCreateWorkspace,
}: WorkspaceSelectorProps) {
  const [name, setName] = useState("");
  const [nameMissing, setNameMissing] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const trimmed = name.trim();
    setNameMissing(!trimmed);
    if (!trimmed) return;
    if (await onCreateWorkspace(trimmed)) setName("");
  }

  return (
    <aside className="saved-panel" aria-label="Workspaces">
      <PanelHeading
        eyebrow="Active workspace"
        title="Your workspaces"
        badge={String(workspaces.length)}
      />
      {!isLoaded && <p className="status-copy">Loading workspaces...</p>}
      {isLoaded && workspaces.length === 0 && (
        <p className="status-copy">
          No workspaces yet. Create one to hold your collections.
        </p>
      )}
      <ul className="saved-list">
        {workspaces.map((workspace) => (
          <li
            className={
              workspace.id === activeWorkspaceId
                ? "saved-item is-active"
                : "saved-item"
            }
            key={workspace.id}
          >
            <button
              className="saved-schema-button"
              type="button"
              onClick={() => onSelectWorkspace(workspace)}
            >
              <strong>{workspace.name}</strong>
              <span>/{workspace.slug}</span>
            </button>
          </li>
        ))}
      </ul>
      <form className="rename-form" onSubmit={handleSubmit}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New workspace name"
          aria-label="New workspace name"
        />
        <button className="button button-add" type="submit">
          Create workspace
        </button>
      </form>
      {(nameMissing || persistenceError) && (
        <div className="feedback-area" aria-live="polite">
          {nameMissing && (
            <p className="feedback error">Enter a name for the workspace.</p>
          )}
          {persistenceError && (
            <p className="feedback error">{persistenceError}</p>
          )}
        </div>
      )}
    </aside>
  );
}
