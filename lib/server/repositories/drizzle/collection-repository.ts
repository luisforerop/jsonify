import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { collections } from "@/db/schema";
import type { CollectionRepository } from "@/lib/server/repositories/collection-repository";
import {
  DuplicateSlugError,
  type Collection,
  type CollectionPatch,
  type NewCollection,
} from "@/lib/server/repositories/types";
import { iso, translateWriteError } from "@/lib/server/repositories/drizzle/shared";

type Row = typeof collections.$inferSelect;

function toCollection(row: Row): Collection {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    isPublic: row.isPublic,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export const drizzleCollectionRepository: CollectionRepository = {
  async findById(id) {
    const [row] = await db
      .select()
      .from(collections)
      .where(eq(collections.id, id))
      .limit(1);
    return row ? toCollection(row) : null;
  },

  async findBySlug(workspaceId, slug) {
    const [row] = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.workspaceId, workspaceId),
          eq(collections.slug, slug),
        ),
      )
      .limit(1);
    return row ? toCollection(row) : null;
  },

  async listByWorkspace(workspaceId) {
    const rows = await db
      .select()
      .from(collections)
      .where(eq(collections.workspaceId, workspaceId));
    return rows.map(toCollection);
  },

  async list() {
    const rows = await db.select().from(collections);
    return rows.map(toCollection);
  },

  async create(input: NewCollection) {
    try {
      const [row] = await db
        .insert(collections)
        .values({
          workspaceId: input.workspaceId,
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          isPublic: input.isPublic ?? false,
        })
        .returning();
      return toCollection(row);
    } catch (error) {
      throw translateWriteError(error, {
        unique: () => new DuplicateSlugError(input.slug),
      });
    }
  },

  async update(id, patch: CollectionPatch) {
    const [row] = await db
      .update(collections)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(collections.id, id))
      .returning();
    return row ? toCollection(row) : null;
  },

  async delete(id) {
    const deleted = await db
      .delete(collections)
      .where(eq(collections.id, id))
      .returning({ id: collections.id });
    return deleted.length > 0;
  },
};
