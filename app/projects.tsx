"use client";

import { useState } from "react";

import { NewProjectForm } from "@/app/components/projects/new-project-form";
import { ProjectsPanel } from "@/app/components/projects/projects-panel";
import { useFormEntries } from "@/hooks/use-form-entries";
import { useProjects } from "@/hooks/use-projects";
import { useSavedSchemas } from "@/hooks/use-saved-schemas";

export default function Projects() {
  const [newProjectName, setNewProjectName] = useState("");
  const [nameMissing, setNameMissing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const { projects, error, isLoaded, create, update, remove } = useProjects();
  const { schemas: allSchemas, remove: removeSchema } = useSavedSchemas();
  const { entries: allEntries, remove: removeEntry } = useFormEntries();

  async function createProject(): Promise<void> {
    const trimmed = newProjectName.trim();
    setNameMissing(!trimmed);
    setNotice(null);
    if (!trimmed) return;

    const project = await create({ name: trimmed });
    if (project) {
      setNewProjectName("");
      setNotice(`Created "${project.name}".`);
    }
  }

  async function renameProject(id: string, name: string): Promise<void> {
    await update(id, { name });
  }

  async function deleteProject(id: string): Promise<void> {
    const projectSchemas = allSchemas.filter(
      (schema) => schema.projectId === id,
    );
    const projectSchemaIds = new Set(
      projectSchemas.map((schema) => schema.id),
    );

    await Promise.all([
      ...allEntries
        .filter((entry) => projectSchemaIds.has(entry.schemaId))
        .map((entry) => removeEntry(entry.id)),
      ...projectSchemas.map((schema) => removeSchema(schema.id)),
    ]);

    if (await remove(id)) {
      setNotice("Project deleted.");
    }
  }

  return (
    <main className="workspace-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            {}
          </span>
          <span>Jsonify</span>
        </div>
      </header>

      <div className="projects-grid">
        <NewProjectForm
          name={newProjectName}
          nameMissing={nameMissing}
          persistenceError={error}
          notice={notice}
          onNameChange={(event) => setNewProjectName(event.target.value)}
          onSubmit={createProject}
        />
        <ProjectsPanel
          projects={projects}
          isLoaded={isLoaded}
          onRenameProject={renameProject}
          onDeleteProject={deleteProject}
        />
      </div>
    </main>
  );
}
