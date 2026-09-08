import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { workspaceMembers } from "@/db/schema";
import type { WorkspaceMemberRepository } from "@/lib/server/repositories/workspace-member-repository";
import {
  DuplicateMemberError,
  type NewWorkspaceMember,
  type WorkspaceMember,
} from "@/lib/server/repositories/types";
import { iso, translateWriteError } from "@/lib/server/repositories/drizzle/shared";

type Row = typeof workspaceMembers.$inferSelect;

function toMember(row: Row): WorkspaceMember {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    role: row.role,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export const drizzleWorkspaceMemberRepository: WorkspaceMemberRepository = {
  async listByWorkspace(workspaceId) {
    const rows = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));
    return rows.map(toMember);
  },

  async listByUser(userId) {
    const rows = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, userId));
    return rows.map(toMember);
  },

  async findByWorkspaceAndUser(workspaceId, userId) {
    const [row] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      )
      .limit(1);
    return row ? toMember(row) : null;
  },

  async create(input: NewWorkspaceMember) {
    try {
      const [row] = await db
        .insert(workspaceMembers)
        .values({
          workspaceId: input.workspaceId,
          userId: input.userId,
          role: input.role ?? "member",
        })
        .returning();
      return toMember(row);
    } catch (error) {
      throw translateWriteError(error, {
        unique: () => new DuplicateMemberError(),
      });
    }
  },

  async delete(id) {
    const deleted = await db
      .delete(workspaceMembers)
      .where(eq(workspaceMembers.id, id))
      .returning({ id: workspaceMembers.id });
    return deleted.length > 0;
  },
};
