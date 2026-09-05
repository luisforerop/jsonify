"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { WorkspaceSelector } from "@/app/components/workspaces/workspace-selector";
import { useSession } from "@/app/session-context";
import { useRequireUser } from "@/hooks/use-require-user";
import { useWorkspaces, type Workspace } from "@/hooks/use-workspaces";

export function WorkspacesView() {
  const currentUser = useRequireUser();
  const router = useRouter();
  const { currentWorkspace, selectWorkspace } = useSession();
  const { workspaces, error, isLoaded, create } = useWorkspaces();

  if (!currentUser) return null;

  function openWorkspace(workspace: Workspace): void {
    selectWorkspace(workspace);
    router.push(`/w/${workspace.slug}`);
  }

  async function createWorkspace(name: string): Promise<boolean> {
    const workspace = await create({ name });
    if (workspace) {
      openWorkspace(workspace);
      return true;
    }
    return false;
  }

  return (
    <main className="workspace-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            {}
          </span>
          <Link className="brand-link" href="/">
            Jsonify
          </Link>
          <span className="brand-divider" aria-hidden="true">
            /
          </span>
          <span className="breadcrumb-current">Workspaces</span>
        </div>
        <div className="topbar-actions">
          <UserButton />
        </div>
      </header>

      <div className="projects-grid">
        <section className="builder-panel" aria-labelledby="workspaces-title">
          <div className="builder-heading">
            <div>
              <p className="eyebrow">{currentUser.name}</p>
              <h1 id="workspaces-title">Your workspaces</h1>
            </div>
          </div>
          <p className="status-copy">
            A workspace is a tenant that holds its own collections, schemas, and
            records. Pick one to open it, or create a new one.
          </p>
        </section>
        <WorkspaceSelector
          workspaces={workspaces}
          activeWorkspaceId={currentWorkspace?.id ?? null}
          isLoaded={isLoaded}
          persistenceError={error}
          onSelectWorkspace={openWorkspace}
          onCreateWorkspace={createWorkspace}
        />
      </div>
    </main>
  );
}
