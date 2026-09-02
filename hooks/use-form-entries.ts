"use client";

import { useEffect, useState } from "react";

import type { FormValues } from "@/lib/schema-form";

const API_BASE = "/api/form-entries";

export type FormEntry = {
  id: string;
  name: string;
  schemaId: string;
  schemaName: string;
  values: FormValues;
  createdAt: string;
  updatedAt: string;
};

export type FormEntryInput = {
  name: string;
  schemaId: string;
  schemaName: string;
  values: FormValues;
};

export type FormEntriesHook = {
  entries: FormEntry[];
  error: string | null;
  isLoaded: boolean;
  create: (input: FormEntryInput) => Promise<FormEntry | null>;
  read: () => Promise<void>;
  update: (id: string, input: FormEntryInput) => Promise<FormEntry | null>;
  remove: (id: string) => Promise<boolean>;
};

const LOAD_ERROR = "Saved form entries are unavailable right now.";
const SAVE_ERROR = "Could not save your form entry.";
const MISSING_ERROR = "The selected form entry no longer exists.";

export function useFormEntries(): FormEntriesHook {
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  async function read(): Promise<void> {
    try {
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      setEntries((await response.json()) as FormEntry[]);
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

  async function create(input: FormEntryInput): Promise<FormEntry | null> {
    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const entry = (await response.json()) as FormEntry;
      setEntries((current) => [...current, entry]);
      setError(null);
      return entry;
    } catch {
      setError(SAVE_ERROR);
      return null;
    }
  }

  async function update(
    id: string,
    input: FormEntryInput,
  ): Promise<FormEntry | null> {
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
      const entry = (await response.json()) as FormEntry;
      setEntries((current) =>
        current.map((item) => (item.id === id ? entry : item)),
      );
      setError(null);
      return entry;
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
      setEntries((current) => current.filter((item) => item.id !== id));
      setError(null);
      return true;
    } catch {
      setError(SAVE_ERROR);
      return false;
    }
  }

  return { entries, error, isLoaded, create, read, update, remove };
}
