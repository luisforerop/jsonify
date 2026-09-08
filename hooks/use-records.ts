"use client";

import { useEffect, useState } from "react";

import type { FormValues } from "@/lib/schema-form";

const API_BASE = "/api/records";

export type SavedRecord = {
  id: string;
  workspaceId: string;
  collectionId: string;
  schemaId: string;
  payload: FormValues;
  createdAt: string;
  updatedAt: string;
};

export type RecordInput = {
  collectionId: string;
  schemaId: string;
  payload: FormValues;
};

export type RecordsHook = {
  records: SavedRecord[];
  error: string | null;
  isLoaded: boolean;
  create: (input: RecordInput) => Promise<SavedRecord | null>;
  read: () => Promise<void>;
  update: (id: string, input: RecordInput) => Promise<SavedRecord | null>;
  remove: (id: string) => Promise<boolean>;
};

const LOAD_ERROR = "Saved records are unavailable right now.";
const SAVE_ERROR = "Could not save your record.";
const MISSING_ERROR = "The selected record no longer exists.";

export function useRecords(collectionId?: string): RecordsHook {
  const [allRecords, setAllRecords] = useState<SavedRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  async function read(): Promise<void> {
    try {
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      setAllRecords((await response.json()) as SavedRecord[]);
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

  async function create(input: RecordInput): Promise<SavedRecord | null> {
    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const record = (await response.json()) as SavedRecord;
      setAllRecords((current) => [...current, record]);
      setError(null);
      return record;
    } catch {
      setError(SAVE_ERROR);
      return null;
    }
  }

  async function update(
    id: string,
    input: RecordInput,
  ): Promise<SavedRecord | null> {
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
      const record = (await response.json()) as SavedRecord;
      setAllRecords((current) =>
        current.map((item) => (item.id === id ? record : item)),
      );
      setError(null);
      return record;
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
      setAllRecords((current) => current.filter((item) => item.id !== id));
      setError(null);
      return true;
    } catch {
      setError(SAVE_ERROR);
      return false;
    }
  }

  const records =
    collectionId === undefined
      ? allRecords
      : allRecords.filter((item) => item.collectionId === collectionId);

  return { records, error, isLoaded, create, read, update, remove };
}
