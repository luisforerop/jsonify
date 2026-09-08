import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import type { UserRepository } from "@/lib/server/repositories/user-repository";
import type { User, UserProfileInput } from "@/lib/server/repositories/types";
import { iso } from "@/lib/server/repositories/drizzle/shared";

type Row = typeof users.$inferSelect;

function toUser(row: Row): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export const drizzleUserRepository: UserRepository = {
  async findById(id) {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ? toUser(row) : null;
  },

  async upsert(id: string, profile: UserProfileInput) {
    const now = new Date();
    const [row] = await db
      .insert(users)
      .values({ id, name: profile.name, email: profile.email })
      .onConflictDoUpdate({
        target: users.id,
        set: { name: profile.name, email: profile.email, updatedAt: now },
      })
      .returning();
    return toUser(row);
  },
};
