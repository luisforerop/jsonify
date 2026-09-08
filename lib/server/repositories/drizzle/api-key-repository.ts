import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { apiKeys } from "@/db/schema";
import type { ApiKeyRepository } from "@/lib/server/repositories/api-key-repository";
import {
  DuplicateApiKeyError,
  type ApiKey,
  type NewApiKey,
} from "@/lib/server/repositories/types";
import {
  iso,
  isoOrNull,
  translateWriteError,
} from "@/lib/server/repositories/drizzle/shared";

type Row = typeof apiKeys.$inferSelect;

function toApiKey(row: Row): ApiKey {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    keyHash: row.keyHash,
    keyPrefix: row.keyPrefix,
    scopes: row.scopes,
    lastUsedAt: isoOrNull(row.lastUsedAt),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export const drizzleApiKeyRepository: ApiKeyRepository = {
  async findById(id) {
    const [row] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);
    return row ? toApiKey(row) : null;
  },

  async findByHash(keyHash, workspaceId) {
    const [row] = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.keyHash, keyHash),
          eq(apiKeys.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    return row ? toApiKey(row) : null;
  },

  async listByWorkspace(workspaceId) {
    const rows = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.workspaceId, workspaceId));
    return rows.map(toApiKey);
  },

  async create(input: NewApiKey) {
    try {
      const [row] = await db
        .insert(apiKeys)
        .values({
          workspaceId: input.workspaceId,
          name: input.name,
          keyHash: input.keyHash,
          keyPrefix: input.keyPrefix,
          scopes: input.scopes,
        })
        .returning();
      return toApiKey(row);
    } catch (error) {
      throw translateWriteError(error, {
        unique: () => new DuplicateApiKeyError(),
      });
    }
  },

  async delete(id) {
    const deleted = await db
      .delete(apiKeys)
      .where(eq(apiKeys.id, id))
      .returning({ id: apiKeys.id });
    return deleted.length > 0;
  },

  async touchLastUsed(id) {
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, id));
  },
};
