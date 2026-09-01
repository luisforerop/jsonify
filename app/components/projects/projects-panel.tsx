"use client";

import Link from "next/link";
import { useState } from "react";

import type { Project } from "@/hooks/use-projects";

import { PanelHeading } from "@/app/components/schema-builder/panel-heading";

type ProjectsPanelProps = {
  projects: Project[];
  isLoaded: boolean;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
};

export function ProjectsPanel({
  projects,
  isLoaded,
  onRenameProject,
  onDeleteProject,
}: ProjectsPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  function startRename(project: Project): void {
    setEditingId(project.id);
    setDraftName(project.name);
  }

  function confirmRename(id: string): void {
    const trimmed = draftName.trim();
    if (trimmed) {
      onRenameProject(id, trimmed);
    }
    setEditingId(null);
  }

  return (
    <aside className="saved-panel" aria-label="Projects">
      <PanelHeading
        eyebrow="Workspace"
        title="Your projects"
        badge={String(projects.length)}
      />
      {!isLoaded && <p className="status-copy">Loading your projects...</p>}
      {isLoaded && projects.length === 0 && (
        <p className="status-copy">
          Create your first project to start saving schemas.
        </p>
      )}
      <ul className="saved-list">
        {projects.map((project) => (
          <li className="saved-item" key={project.id}>
            {editingId === project.id ? (
              <form
                className="rename-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  confirmRename(project.id);
                }}
              >
                <input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  onBlur={() => confirmRename(project.id)}
                  autoFocus
                />
              </form>
            ) : (
              <Link
                className="saved-schema-button"
                href={`/projects/${project.id}`}
              >
                <strong>{project.name}</strong>
                <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
              </Link>
            )}
            <div className="saved-item-actions">
              <button
                className="text-button"
                type="button"
                onClick={() => startRename(project)}
              >
                Rename
              </button>
              <button
                className="delete-button"
                type="button"
                onClick={() => onDeleteProject(project.id)}
                aria-label={`Delete ${project.name}`}
                title={`Delete ${project.name}`}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
