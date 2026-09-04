"use client";

import { useCallback, useEffect, useState } from "react";

const API_BASE = "/api/api-keys";

export type ApiKey = {
  id: string;
  name: string;
  workspaceId: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiKeyInput = {
  name: string;
  workspaceId: string;
  scopes: string[];
};

/** The create response: the masked key metadata plus the raw secret, shown once. */
export type CreatedApiKey = ApiKey & { key: string };

export type ApiKeysHook = {
  apiKeys: ApiKey[];
  error: string | null;
  isLoaded: boolean;
  create: (input: ApiKeyInput) => Promise<CreatedApiKey | null>;
  read: () => Promise<void>;
  remove: (id: string) => Promise<boolean>;
};

const LOAD_ERROR = "Saved API keys are unavailable right now.";
const SAVE_ERROR = "Could not create your API key.";
const MISSING_ERROR = "The selected API key no longer exists.";

export function useApiKeys(workspaceId: string): ApiKeysHook {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const read = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(
        `${API_BASE}?workspaceId=${encodeURIComponent(workspaceId)}`,
      );
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      setApiKeys((await response.json()) as ApiKey[]);
      setError(null);
    } catch {
      setError(LOAD_ERROR);
    } finally {
      setIsLoaded(true);
    }
  }, [workspaceId]);

  useEffect(() => {
    void read();
  }, [read]);

  async function create(input: ApiKeyInput): Promise<CreatedApiKey | null> {
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
      const created = (await response.json()) as CreatedApiKey;
      const masked: ApiKey = {
        id: created.id,
        name: created.name,
        workspaceId: created.workspaceId,
        keyPrefix: created.keyPrefix,
        scopes: created.scopes,
        lastUsedAt: created.lastUsedAt,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };
      setApiKeys((current) => [...current, masked]);
      setError(null);
      return created;
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
      setApiKeys((current) => current.filter((item) => item.id !== id));
      setError(null);
      return true;
    } catch {
      setError(SAVE_ERROR);
      return false;
    }
  }

  return { apiKeys, error, isLoaded, create, read, remove };
}
