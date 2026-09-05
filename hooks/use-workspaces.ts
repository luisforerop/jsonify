"use client";

import { useEffect, useState } from "react";

const API_BASE = "/api/workspaces";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceInput = {
  name: string;
};

export type WorkspacesHook = {
  workspaces: Workspace[];
  error: string | null;
  isLoaded: boolean;
  create: (input: WorkspaceInput) => Promise<Workspace | null>;
  read: () => Promise<void>;
};

const LOAD_ERROR = "Saved workspaces are unavailable right now.";
const SAVE_ERROR = "Could not save your workspace.";

/**
 * Lists and creates the signed-in user's workspaces. The server scopes
 * `GET`/`POST` to the authenticated session, so no owner id is passed here.
 */
export function useWorkspaces(): WorkspacesHook {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  async function read(): Promise<void> {
    try {
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      setWorkspaces((await response.json()) as Workspace[]);
      setError(null);
    } catch {
      setError(LOAD_ERROR);
    } finally {
      setIsLoaded(true);
    }
  }

  useEffect(() => {
    void read();
  }, []);

  async function create(input: WorkspaceInput): Promise<Workspace | null> {
    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (response.status === 400) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? SAVE_ERROR);
        return null;
      }
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const workspace = (await response.json()) as Workspace;
      setWorkspaces((current) => [...current, workspace]);
      setError(null);
      return workspace;
    } catch {
      setError(SAVE_ERROR);
      return null;
    }
  }

  return { workspaces, error, isLoaded, create, read };
}
