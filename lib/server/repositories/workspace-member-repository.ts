import type {
  NewWorkspaceMember,
  WorkspaceMember,
} from "@/lib/server/repositories/types";

export interface WorkspaceMemberRepository {
  listByWorkspace(workspaceId: string): Promise<WorkspaceMember[]>;
  listByUser(userId: string): Promise<WorkspaceMember[]>;
  findByWorkspaceAndUser(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null>;
  /** Throws `DuplicateMemberError` when the user already belongs to the workspace. */
  create(input: NewWorkspaceMember): Promise<WorkspaceMember>;
  delete(id: string): Promise<boolean>;
}
