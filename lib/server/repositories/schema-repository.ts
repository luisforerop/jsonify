import type {
  NewSchema,
  SchemaPatch,
  SchemaRow,
} from "@/lib/server/repositories/types";

export interface SchemaRepository {
  findById(id: string): Promise<SchemaRow | null>;
  /** Resolve by `name` first, then by `id`, within one collection (the `x-schema` header lookup). */
  findByNameOrId(collectionId: string, ref: string): Promise<SchemaRow | null>;
  listByCollection(collectionId: string): Promise<SchemaRow[]>;
  list(): Promise<SchemaRow[]>;
  /** Throws `DuplicateSchemaNameError` when the collection already has that name. */
  create(input: NewSchema): Promise<SchemaRow>;
  update(id: string, patch: SchemaPatch): Promise<SchemaRow | null>;
  delete(id: string): Promise<boolean>;
}
