"use client";

import Link from "next/link";

import { Breadcrumb } from "@/app/components/shared/breadcrumb";
import { useProjects } from "@/hooks/use-projects";

type WorkspacePanelProps = {
  projectId: string;
};

export function WorkspacePanel({ projectId }: WorkspacePanelProps) {
  const { projects, isLoaded } = useProjects();
  const project = projects.find((candidate) => candidate.id === projectId);

  return (
    <main className="workspace-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            {}
          </span>
          <Breadcrumb
            projectId={projectId}
            projectName={project?.name ?? null}
          />
        </div>
        <div className="topbar-actions">
          <Link className="button button-secondary" href="/">
            All projects
          </Link>
        </div>
      </header>

      <div className="projects-grid">
        <section className="builder-panel" aria-labelledby="project-title">
          {!isLoaded && <p className="status-copy">Loading project...</p>}
          {isLoaded && !project && (
            <>
              <div className="builder-heading">
                <div>
                  <p className="eyebrow">Project</p>
                  <h1 id="project-title">Project not found</h1>
                </div>
              </div>
              <p className="status-copy">
                This project may have been deleted. Head back to your projects
                list to pick another one.
              </p>
            </>
          )}
          {isLoaded && project && (
            <>
              <div className="builder-heading">
                <div>
                  <p className="eyebrow">Project</p>
                  <h1 id="project-title">{project.name}</h1>
                </div>
              </div>
              <p className="status-copy">
                Build and save JSON Schemas, then fill them in as forms, all
                scoped to this project.
              </p>
              <div className="properties-heading">
                <div>
                  <h2>Continue in this project</h2>
                  <p>Jump into the schema-builder or the form-filler.</p>
                </div>
              </div>
              <div className="topbar-actions">
                <Link
                  className="button button-primary"
                  href={`/projects/${projectId}/schema-builder`}
                >
                  Schema builder
                </Link>
                <Link
                  className="button button-outline"
                  href={`/projects/${projectId}/form-filler`}
                >
                  Form filler
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
