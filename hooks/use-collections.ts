"use client";

import { useEffect, useState } from "react";

const API_BASE = "/api/collections";

export type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
};

export type CollectionInput = {
  name: string;
  workspaceId: string;
  description?: string;
};

export type CollectionUpdate = {
  name: string;
  workspaceId: string;
  description?: string;
};

export type CollectionsHook = {
  collections: Collection[];
  error: string | null;
  isLoaded: boolean;
  create: (input: CollectionInput) => Promise<Collection | null>;
  read: () => Promise<void>;
  update: (id: string, input: CollectionUpdate) => Promise<Collection | null>;
  remove: (id: string) => Promise<boolean>;
};

const LOAD_ERROR = "Saved collections are unavailable right now.";
const SAVE_ERROR = "Could not save your collection.";
const MISSING_ERROR = "The selected collection no longer exists.";

export function useCollections(workspaceId?: string): CollectionsHook {
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  async function read(): Promise<void> {
    try {
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      setAllCollections((await response.json()) as Collection[]);
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

  async function create(input: CollectionInput): Promise<Collection | null> {
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
      const collection = (await response.json()) as Collection;
      setAllCollections((current) => [...current, collection]);
      setError(null);
      return collection;
    } catch {
      setError(SAVE_ERROR);
      return null;
    }
  }

  async function update(
    id: string,
    input: CollectionUpdate,
  ): Promise<Collection | null> {
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
      const collection = (await response.json()) as Collection;
      setAllCollections((current) =>
        current.map((item) => (item.id === id ? collection : item)),
      );
      setError(null);
      return collection;
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
      setAllCollections((current) => current.filter((item) => item.id !== id));
      setError(null);
      return true;
    } catch {
      setError(SAVE_ERROR);
      return false;
    }
  }

  const collections =
    workspaceId === undefined
      ? allCollections
      : allCollections.filter((item) => item.workspaceId === workspaceId);

  return { collections, error, isLoaded, create, read, update, remove };
}
