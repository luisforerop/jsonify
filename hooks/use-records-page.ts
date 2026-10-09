"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { SavedRecord } from "@/hooks/use-records";

const API_BASE = "/api/records";
const LOAD_ERROR = "Records are unavailable right now.";
const DELETE_ERROR = "Could not delete the record.";

export type RecordsPageParams = {
  collectionId?: string;
  schemaId?: string;
  page: number;
  pageSize: number;
};

export type RecordsPageHook = {
  rows: SavedRecord[];
  total: number;
  error: string | null;
  isLoading: boolean;
  /** True once the first request settled (success or failure). */
  isLoaded: boolean;
  refetch: () => Promise<void>;
  remove: (id: string) => Promise<boolean>;
};

type PageResponse = { rows: SavedRecord[]; total: number };

export function useRecordsPage({
  collectionId,
  schemaId,
  page,
  pageSize,
}: RecordsPageParams): RecordsPageHook {
  const [rows, setRows] = useState<SavedRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  // Ignore responses from requests that a newer one superseded.
  const requestId = useRef(0);

  const refetch = useCallback(async (): Promise<void> => {
    if (!collectionId) return;
    const current = ++requestId.current;
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        collectionId,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (schemaId) query.set("schemaId", schemaId);
      const response = await fetch(`${API_BASE}?${query.toString()}`);
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const body = (await response.json()) as PageResponse;
      if (current !== requestId.current) return;
      // Previous rows stay on screen until this swap, so paging never flashes empty.
      setRows(body.rows);
      setTotal(body.total);
      setError(null);
    } catch {
      if (current !== requestId.current) return;
      setError(LOAD_ERROR);
    } finally {
      if (current === requestId.current) {
        setIsLoading(false);
        setIsLoaded(true);
      }
    }
  }, [collectionId, schemaId, page, pageSize]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  async function remove(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      await refetch();
      return true;
    } catch {
      setError(DELETE_ERROR);
      return false;
    }
  }

  return { rows, total, error, isLoading, isLoaded, refetch, remove };
}
