import type { ApiKey, NewApiKey } from "@/lib/server/repositories/types";

export interface ApiKeyRepository {
  findById(id: string): Promise<ApiKey | null>;
  findByHash(keyHash: string, workspaceId: string): Promise<ApiKey | null>;
  listByWorkspace(workspaceId: string): Promise<ApiKey[]>;
  create(input: NewApiKey): Promise<ApiKey>;
  delete(id: string): Promise<boolean>;
  /** Best-effort `last_used_at = now()`; callers do not await failures. */
  touchLastUsed(id: string): Promise<void>;
}
