import type {
  Collection,
  CollectionPatch,
  NewCollection,
} from "@/lib/server/repositories/types";

export interface CollectionRepository {
  findById(id: string): Promise<Collection | null>;
  findBySlug(workspaceId: string, slug: string): Promise<Collection | null>;
  listByWorkspace(workspaceId: string): Promise<Collection[]>;
  /** Every collection the caller is allowed to see is scoped upstream; this is the raw list. */
  list(): Promise<Collection[]>;
  /** Throws `DuplicateSlugError` when the workspace already has that slug. */
  create(input: NewCollection): Promise<Collection>;
  update(id: string, patch: CollectionPatch): Promise<Collection | null>;
  /** Cascades to the collection's schemas and records in the database. */
  delete(id: string): Promise<boolean>;
}
