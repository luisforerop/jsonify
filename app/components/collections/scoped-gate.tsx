"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import type { ScopedCollectionStatus } from "@/hooks/use-scoped-collection";

type ScopedGateProps = {
  status: ScopedCollectionStatus;
  children: ReactNode;
};

/**
 * Renders `children` only when the URL's workspace/collection slugs resolved to
 * real records for the active user. Otherwise shows the matching fallback, and
 * sends a visitor with no active user back to `/login`.
 */
export function ScopedGate({ status, children }: ScopedGateProps) {
  const router = useRouter();

  useEffect(() => {
    if (status === "no-user") router.replace("/login");
  }, [status, router]);

  if (status === "ready") return <>{children}</>;

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
        </div>
      </header>
      <div className="projects-grid">
        <section className="builder-panel" aria-labelledby="scoped-gate-title">
          {(status === "loading" || status === "no-user") && (
            <p className="status-copy">Loading this workspace...</p>
          )}
          {status === "not-found" && (
            <>
              <div className="builder-heading">
                <div>
                  <p className="eyebrow">Not found</p>
                  <h1 id="scoped-gate-title">
                    This workspace or collection isn&apos;t available
                  </h1>
                </div>
              </div>
              <p className="status-copy">
                It may have been deleted, or it belongs to a different user.
              </p>
              <div className="topbar-actions">
                <Link className="button button-primary" href="/workspaces">
                  Back to my workspaces
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
