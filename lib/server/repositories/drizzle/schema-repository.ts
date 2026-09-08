import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { schemas } from "@/db/schema";
import type { SchemaRepository } from "@/lib/server/repositories/schema-repository";
import {
  DuplicateSchemaNameError,
  type NewSchema,
  type SchemaPatch,
  type SchemaRow,
} from "@/lib/server/repositories/types";
import { iso, translateWriteError } from "@/lib/server/repositories/drizzle/shared";

type Row = typeof schemas.$inferSelect;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toSchema(row: Row): SchemaRow {
  return {
    id: row.id,
    collectionId: row.collectionId,
    name: row.name,
    schemaDefinition: row.schemaDefinition,
    isActive: row.isActive,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export const drizzleSchemaRepository: SchemaRepository = {
  async findById(id) {
    const [row] = await db
      .select()
      .from(schemas)
      .where(eq(schemas.id, id))
      .limit(1);
    return row ? toSchema(row) : null;
  },

  async findByNameOrId(collectionId, ref) {
    const [byName] = await db
      .select()
      .from(schemas)
      .where(and(eq(schemas.collectionId, collectionId), eq(schemas.name, ref)))
      .limit(1);
    if (byName) return toSchema(byName);

    if (!UUID_RE.test(ref)) return null;
    const [byId] = await db
      .select()
      .from(schemas)
      .where(and(eq(schemas.collectionId, collectionId), eq(schemas.id, ref)))
      .limit(1);
    return byId ? toSchema(byId) : null;
  },

  async listByCollection(collectionId) {
    const rows = await db
      .select()
      .from(schemas)
      .where(eq(schemas.collectionId, collectionId));
    return rows.map(toSchema);
  },

  async list() {
    const rows = await db.select().from(schemas);
    return rows.map(toSchema);
  },

  async create(input: NewSchema) {
    try {
      const [row] = await db
        .insert(schemas)
        .values({
          collectionId: input.collectionId,
          name: input.name,
          schemaDefinition: input.schemaDefinition,
          isActive: input.isActive ?? true,
        })
        .returning();
      return toSchema(row);
    } catch (error) {
      throw translateWriteError(error, {
        unique: () => new DuplicateSchemaNameError(input.name),
      });
    }
  },

  async update(id, patch: SchemaPatch) {
    const [row] = await db
      .update(schemas)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(schemas.id, id))
      .returning();
    return row ? toSchema(row) : null;
  },

  async delete(id) {
    const deleted = await db
      .delete(schemas)
      .where(eq(schemas.id, id))
      .returning({ id: schemas.id });
    return deleted.length > 0;
  },
};
