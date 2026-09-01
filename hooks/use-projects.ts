"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "jsonify.projects.v1";

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
  create: (input: ProjectInput) => Project | null;
  read: () => void;
  update: (id: string, input: ProjectInput) => Project | null;
  remove: (id: string) => boolean;
};

function parseProjects(value: string | null): Project[] {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isProject);
  } catch {
    return [];
  }
}

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Project>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  );
}

function createProjectId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `project-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export function useProjects(): ProjectsHook {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  function readAllProjects(): Project[] {
    return parseProjects(window.localStorage.getItem(STORAGE_KEY));
  }

  function read(): void {
    try {
      setProjects(readAllProjects());
      setError(null);
    } catch {
      setError("Saved projects are unavailable in this browser.");
    } finally {
      setIsLoaded(true);
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(read, 0);

    return () => window.clearTimeout(loadTimer);
  }, []);

  function persist(nextProjects: Project[]): boolean {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProjects));
      setProjects(nextProjects);
      setError(null);
      return true;
    } catch {
      setError("Could not save your project in this browser.");
      return false;
    }
  }

  function create(input: ProjectInput): Project | null {
    const now = new Date().toISOString();
    const project: Project = {
      id: createProjectId(),
      name: input.name,
      createdAt: now,
      updatedAt: now,
    };

    return persist([...readAllProjects(), project]) ? project : null;
  }

  function update(id: string, input: ProjectInput): Project | null {
    const currentProjects = readAllProjects();
    const existingProject = currentProjects.find(
      (project) => project.id === id,
    );

    if (!existingProject) {
      setError("The selected project no longer exists.");
      return null;
    }

    const updatedProject: Project = {
      ...existingProject,
      name: input.name,
      updatedAt: new Date().toISOString(),
    };
    const nextProjects = currentProjects.map((project) =>
      project.id === id ? updatedProject : project,
    );

    return persist(nextProjects) ? updatedProject : null;
  }

  function remove(id: string): boolean {
    const currentProjects = readAllProjects();
    const nextProjects = currentProjects.filter(
      (project) => project.id !== id,
    );

    if (nextProjects.length === currentProjects.length) {
      setError("The selected project no longer exists.");
      return false;
    }

    return persist(nextProjects);
  }

  return { projects, error, isLoaded, create, read, update, remove };
}
