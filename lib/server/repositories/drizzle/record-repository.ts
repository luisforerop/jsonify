import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { records } from "@/db/schema";
import type { RecordRepository } from "@/lib/server/repositories/record-repository";
import type {
  NewRecord,
  RecordPatch,
  RecordRow,
} from "@/lib/server/repositories/types";
import { iso } from "@/lib/server/repositories/drizzle/shared";

type Row = typeof records.$inferSelect;

function toRecord(row: Row): RecordRow {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    collectionId: row.collectionId,
    schemaId: row.schemaId,
    payload: row.payload,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export const drizzleRecordRepository: RecordRepository = {
  async findById(id) {
    const [row] = await db
      .select()
      .from(records)
      .where(eq(records.id, id))
      .limit(1);
    return row ? toRecord(row) : null;
  },

  async listByCollection(collectionId) {
    const rows = await db
      .select()
      .from(records)
      .where(eq(records.collectionId, collectionId));
    return rows.map(toRecord);
  },

  async list() {
    const rows = await db.select().from(records);
    return rows.map(toRecord);
  },

  async create(input: NewRecord) {
    const [row] = await db
      .insert(records)
      .values({
        workspaceId: input.workspaceId,
        collectionId: input.collectionId,
        schemaId: input.schemaId,
        payload: input.payload,
      })
      .returning();
    return toRecord(row);
  },

  async update(id, patch: RecordPatch) {
    const [row] = await db
      .update(records)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(records.id, id))
      .returning();
    return row ? toRecord(row) : null;
  },

  async delete(id) {
    const deleted = await db
      .delete(records)
      .where(eq(records.id, id))
      .returning({ id: records.id });
    return deleted.length > 0;
  },
};
