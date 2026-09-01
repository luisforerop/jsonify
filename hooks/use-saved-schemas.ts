"use client";

import { useEffect, useState } from "react";

import type { JsonSchema } from "@/lib/schema-builder";

const STORAGE_KEY = "jsonify.saved-schemas.v1";

export type SavedSchema = {
  id: string;
  name: string;
  schema: JsonSchema;
  projectId: string;
  createdAt: string;
  updatedAt: string;
};

export type SavedSchemaInput = {
  name: string;
  schema: JsonSchema;
  projectId: string;
};

export type SavedSchemasHook = {
  schemas: SavedSchema[];
  error: string | null;
  isLoaded: boolean;
  create: (input: SavedSchemaInput) => SavedSchema | null;
  read: () => void;
  update: (id: string, input: SavedSchemaInput) => SavedSchema | null;
  remove: (id: string) => boolean;
};

function parseSavedSchemas(value: string | null): SavedSchema[] {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isSavedSchema);
  } catch {
    return [];
  }
}

function isSavedSchema(value: unknown): value is SavedSchema {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SavedSchema>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.projectId === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.schema === "object" &&
    candidate.schema !== null
  );
}

function createSavedSchemaId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `schema-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export function useSavedSchemas(projectId?: string): SavedSchemasHook {
  const [allSchemas, setAllSchemas] = useState<SavedSchema[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  function readAllSchemas(): SavedSchema[] {
    return parseSavedSchemas(window.localStorage.getItem(STORAGE_KEY));
  }

  function read(): void {
    try {
      setAllSchemas(readAllSchemas());
      setError(null);
    } catch {
      setError("Saved schemas are unavailable in this browser.");
    } finally {
      setIsLoaded(true);
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(read, 0);

    return () => window.clearTimeout(loadTimer);
  }, []);

  function persist(nextSchemas: SavedSchema[]): boolean {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSchemas));
      setAllSchemas(nextSchemas);
      setError(null);
      return true;
    } catch {
      setError("Could not save your schema in this browser.");
      return false;
    }
  }

  function create(input: SavedSchemaInput): SavedSchema | null {
    const now = new Date().toISOString();
    const savedSchema: SavedSchema = {
      id: createSavedSchemaId(),
      name: input.name,
      schema: input.schema,
      projectId: input.projectId,
      createdAt: now,
      updatedAt: now,
    };

    return persist([...readAllSchemas(), savedSchema]) ? savedSchema : null;
  }

  function update(id: string, input: SavedSchemaInput): SavedSchema | null {
    const currentSchemas = readAllSchemas();
    const existingSchema = currentSchemas.find((schema) => schema.id === id);

    if (!existingSchema) {
      setError("The selected schema no longer exists.");
      return null;
    }

    const updatedSchema: SavedSchema = {
      ...existingSchema,
      name: input.name,
      schema: input.schema,
      projectId: input.projectId,
      updatedAt: new Date().toISOString(),
    };
    const nextSchemas = currentSchemas.map((schema) =>
      schema.id === id ? updatedSchema : schema,
    );

    return persist(nextSchemas) ? updatedSchema : null;
  }

  function remove(id: string): boolean {
    const currentSchemas = readAllSchemas();
    const nextSchemas = currentSchemas.filter((schema) => schema.id !== id);

    if (nextSchemas.length === currentSchemas.length) {
      setError("The selected schema no longer exists.");
      return false;
    }

    return persist(nextSchemas);
  }

  const schemas =
    projectId === undefined
      ? allSchemas
      : allSchemas.filter((schema) => schema.projectId === projectId);

  return { schemas, error, isLoaded, create, read, update, remove };
}
