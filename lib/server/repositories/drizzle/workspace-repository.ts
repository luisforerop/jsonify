import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { workspaceMembers, workspaces } from "@/db/schema";
import type { WorkspaceRepository } from "@/lib/server/repositories/workspace-repository";
import {
  DuplicateSlugError,
  ResourceInUseError,
  type NewWorkspace,
  type Workspace,
  type WorkspacePatch,
} from "@/lib/server/repositories/types";
import { iso, translateWriteError } from "@/lib/server/repositories/drizzle/shared";

type Row = typeof workspaces.$inferSelect;

function toWorkspace(row: Row): Workspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ownerId: row.ownerId,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export const drizzleWorkspaceRepository: WorkspaceRepository = {
  async findById(id) {
    const [row] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id))
      .limit(1);
    return row ? toWorkspace(row) : null;
  },

  async findBySlug(ownerId, slug) {
    const [row] = await db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.ownerId, ownerId), eq(workspaces.slug, slug)))
      .limit(1);
    return row ? toWorkspace(row) : null;
  },

  async listByOwner(ownerId) {
    const rows = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerId, ownerId));
    return rows.map(toWorkspace);
  },

  async create(input: NewWorkspace) {
    try {
      return await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(workspaces)
          .values({ name: input.name, slug: input.slug, ownerId: input.ownerId })
          .returning();
        await tx.insert(workspaceMembers).values({
          workspaceId: row.id,
          userId: input.ownerId,
          role: "owner",
        });
        return toWorkspace(row);
      });
    } catch (error) {
      throw translateWriteError(error, {
        unique: () => new DuplicateSlugError(input.slug),
      });
    }
  },

  async update(id, patch: WorkspacePatch) {
    const [row] = await db
      .update(workspaces)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning();
    return row ? toWorkspace(row) : null;
  },

  async delete(id) {
    try {
      const deleted = await db
        .delete(workspaces)
        .where(eq(workspaces.id, id))
        .returning({ id: workspaces.id });
      return deleted.length > 0;
    } catch (error) {
      throw translateWriteError(error, {
        foreignKey: () => new ResourceInUseError(),
      });
    }
  },
};
