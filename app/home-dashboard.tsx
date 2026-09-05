"use client";

import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { useSession } from "@/app/session-context";
import { useWorkspaces } from "@/hooks/use-workspaces";

export function HomeDashboard() {
  const { currentUser } = useSession();
  const { workspaces, isLoaded } = useWorkspaces();

  return (
    <main className="workspace-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            {}
          </span>
          <span>Jsonify</span>
        </div>
        <div className="topbar-actions">
          <Show when="signed-out">
            <SignInButton />
            <SignUpButton />
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </header>

      <div className="projects-grid">
        <Show when="signed-out">
          <section className="builder-panel" aria-labelledby="home-title">
            <div className="builder-heading">
              <div>
                <p className="eyebrow">Welcome</p>
                <h1 id="home-title">Build and share JSON schemas</h1>
              </div>
            </div>
            <p className="status-copy">
              Sign in or create an account to start building workspaces,
              schemas, and records.
            </p>
          </section>
        </Show>

        <Show when="signed-in">
          <section className="builder-panel" aria-labelledby="home-title">
            <div className="builder-heading">
              <div>
                <p className="eyebrow">Signed in as {currentUser?.email}</p>
                <h1 id="home-title">Welcome back, {currentUser?.name}</h1>
              </div>
            </div>
            <p className="status-copy">
              {!isLoaded
                ? "Loading your workspaces..."
                : workspaces.length === 0
                  ? "You don't have any workspaces yet. Create your first one to start building schemas."
                  : `You have ${workspaces.length} workspace${
                      workspaces.length === 1 ? "" : "s"
                    }.`}
            </p>
            <div className="properties-heading">
              <div>
                <h2>Your workspaces</h2>
                <p>
                  Open a workspace to manage its collections, schemas, and
                  records.
                </p>
              </div>
            </div>
            <div className="topbar-actions">
              <Link className="button button-primary" href="/workspaces">
                Go to my workspaces
              </Link>
            </div>
          </section>
        </Show>
      </div>
    </main>
  );
}
