import type { JsonSchema } from "@/lib/schema-builder";
import type { SchemaRow } from "@/lib/server/repositories";

/**
 * A saved schema as returned by the internal `/api/schemas` routes. The stored
 * column is `schemaDefinition`; the wire field stays `schema` so the
 * schema-builder and form-filler keep reading `savedSchema.schema`.
 */
export type SavedSchemaResponse = {
  id: string;
  name: string;
  schema: JsonSchema;
  collectionId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toSavedSchema(row: SchemaRow): SavedSchemaResponse {
  return {
    id: row.id,
    name: row.name,
    schema: row.schemaDefinition,
    collectionId: row.collectionId,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
