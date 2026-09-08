import type {
  NewWorkspace,
  Workspace,
  WorkspacePatch,
} from "@/lib/server/repositories/types";

export interface WorkspaceRepository {
  findById(id: string): Promise<Workspace | null>;
  findBySlug(ownerId: string, slug: string): Promise<Workspace | null>;
  listByOwner(ownerId: string): Promise<Workspace[]>;
  /**
   * Creates the workspace and, in the same transaction, its creator's
   * `owner` membership row. Throws `DuplicateSlugError` when the owner already
   * has a workspace with that slug.
   */
  create(input: NewWorkspace): Promise<Workspace>;
  update(id: string, patch: WorkspacePatch): Promise<Workspace | null>;
  delete(id: string): Promise<boolean>;
}
