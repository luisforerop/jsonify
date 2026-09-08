"use client";

import { useEffect, useState } from "react";

import type { JsonSchema } from "@/lib/schema-builder";

const API_BASE = "/api/schemas";

export type SavedSchema = {
  id: string;
  name: string;
  schema: JsonSchema;
  collectionId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SavedSchemaInput = {
  name: string;
  schema: JsonSchema;
  collectionId: string;
};

export type SavedSchemasHook = {
  schemas: SavedSchema[];
  error: string | null;
  isLoaded: boolean;
  create: (input: SavedSchemaInput) => Promise<SavedSchema | null>;
  read: () => Promise<void>;
  update: (id: string, input: SavedSchemaInput) => Promise<SavedSchema | null>;
  remove: (id: string) => Promise<boolean>;
};

const LOAD_ERROR = "Saved schemas are unavailable right now.";
const SAVE_ERROR = "Could not save your schema.";
const MISSING_ERROR = "The selected schema no longer exists.";

export function useSavedSchemas(collectionId?: string): SavedSchemasHook {
  const [allSchemas, setAllSchemas] = useState<SavedSchema[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  async function read(): Promise<void> {
    try {
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      setAllSchemas((await response.json()) as SavedSchema[]);
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

  async function create(input: SavedSchemaInput): Promise<SavedSchema | null> {
    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const savedSchema = (await response.json()) as SavedSchema;
      setAllSchemas((current) => [...current, savedSchema]);
      setError(null);
      return savedSchema;
    } catch {
      setError(SAVE_ERROR);
      return null;
    }
  }

  async function update(
    id: string,
    input: SavedSchemaInput,
  ): Promise<SavedSchema | null> {
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
      const savedSchema = (await response.json()) as SavedSchema;
      setAllSchemas((current) =>
        current.map((item) => (item.id === id ? savedSchema : item)),
      );
      setError(null);
      return savedSchema;
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
      setAllSchemas((current) => current.filter((item) => item.id !== id));
      setError(null);
      return true;
    } catch {
      setError(SAVE_ERROR);
      return false;
    }
  }

  const schemas =
    collectionId === undefined
      ? allSchemas
      : allSchemas.filter((schema) => schema.collectionId === collectionId);

  return { schemas, error, isLoaded, create, read, update, remove };
}
