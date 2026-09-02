"use client";

import { useEffect, useState } from "react";

const API_BASE = "/api/projects";

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectInput = {
  name: string;
};

export type ProjectsHook = {
  projects: Project[];
  error: string | null;
  isLoaded: boolean;
  create: (input: ProjectInput) => Promise<Project | null>;
  read: () => Promise<void>;
  update: (id: string, input: ProjectInput) => Promise<Project | null>;
  remove: (id: string) => Promise<boolean>;
};

const LOAD_ERROR = "Saved projects are unavailable right now.";
const SAVE_ERROR = "Could not save your project.";
const MISSING_ERROR = "The selected project no longer exists.";

export function useProjects(): ProjectsHook {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  async function read(): Promise<void> {
    try {
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      setProjects((await response.json()) as Project[]);
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

  async function create(input: ProjectInput): Promise<Project | null> {
    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const project = (await response.json()) as Project;
      setProjects((current) => [...current, project]);
      setError(null);
      return project;
    } catch {
      setError(SAVE_ERROR);
      return null;
    }
  }

  async function update(
    id: string,
    input: ProjectInput,
  ): Promise<Project | null> {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (response.status === 404) {
        setError(MISSING_ERROR);
        return null;
      }
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const project = (await response.json()) as Project;
      setProjects((current) =>
        current.map((item) => (item.id === id ? project : item)),
      );
      setError(null);
      return project;
    } catch {
      setError(SAVE_ERROR);
      return null;
    }
  }

  async function remove(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      if (response.status === 404) {
        setError(MISSING_ERROR);
        return false;
      }
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      setProjects((current) => current.filter((item) => item.id !== id));
      setError(null);
      return true;
    } catch {
      setError(SAVE_ERROR);
      return false;
    }
  }

  return { projects, error, isLoaded, create, read, update, remove };
}
