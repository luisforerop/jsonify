"use client";

import { useEffect, useState } from "react";

import type { FormValues } from "@/lib/schema-form";

const STORAGE_KEY = "jsonify.form-entries.v1";

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
  create: (input: FormEntryInput) => FormEntry | null;
  read: () => void;
  update: (id: string, input: FormEntryInput) => FormEntry | null;
  remove: (id: string) => boolean;
};

function parseFormEntries(value: string | null): FormEntry[] {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isFormEntry);
  } catch {
    return [];
  }
}

function isFormEntry(value: unknown): value is FormEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FormEntry>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.schemaId === "string" &&
    typeof candidate.schemaName === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.values === "object" &&
    candidate.values !== null
  );
}

function createFormEntryId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `entry-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export function useFormEntries(): FormEntriesHook {
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  function readAllEntries(): FormEntry[] {
    return parseFormEntries(window.localStorage.getItem(STORAGE_KEY));
  }

  function read(): void {
    try {
      setEntries(readAllEntries());
      setError(null);
    } catch {
      setError("Saved form entries are unavailable in this browser.");
    } finally {
      setIsLoaded(true);
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(read, 0);

    return () => window.clearTimeout(loadTimer);
  }, []);

  function persist(nextEntries: FormEntry[]): boolean {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
      setEntries(nextEntries);
      setError(null);
      return true;
    } catch {
      setError("Could not save your form entry in this browser.");
      return false;
    }
  }

  function create(input: FormEntryInput): FormEntry | null {
    const now = new Date().toISOString();
    const entry: FormEntry = {
      id: createFormEntryId(),
      name: input.name,
      schemaId: input.schemaId,
      schemaName: input.schemaName,
      values: input.values,
      createdAt: now,
      updatedAt: now,
    };

    return persist([...readAllEntries(), entry]) ? entry : null;
  }

  function update(id: string, input: FormEntryInput): FormEntry | null {
    const currentEntries = readAllEntries();
    const existingEntry = currentEntries.find((entry) => entry.id === id);

    if (!existingEntry) {
      setError("The selected form entry no longer exists.");
      return null;
    }

    const updatedEntry: FormEntry = {
      ...existingEntry,
      name: input.name,
      schemaId: input.schemaId,
      schemaName: input.schemaName,
      values: input.values,
      updatedAt: new Date().toISOString(),
    };
    const nextEntries = currentEntries.map((entry) =>
      entry.id === id ? updatedEntry : entry,
    );

    return persist(nextEntries) ? updatedEntry : null;
  }

  function remove(id: string): boolean {
    const currentEntries = readAllEntries();
    const nextEntries = currentEntries.filter((entry) => entry.id !== id);

    if (nextEntries.length === currentEntries.length) {
      setError("The selected form entry no longer exists.");
      return false;
    }

    return persist(nextEntries);
  }

  return { entries, error, isLoaded, create, read, update, remove };
}
