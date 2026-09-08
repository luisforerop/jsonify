import {
  getRepositories,
  type Repositories,
} from "@/lib/server/repositories/registry";

/**
 * The repository registry consumers use: `repositories.workspaces.create(...)`.
 * It always delegates to the active wiring, so a test that calls
 * `setRepositories({ workspaces: fake })` is seen here immediately.
 */
export const repositories: Repositories = new Proxy({} as Repositories, {
  get: (_target, prop: string) =>
    getRepositories()[prop as keyof Repositories],
});

export {
  getRepositories,
  setRepositories,
  resetRepositories,
  type Repositories,
} from "@/lib/server/repositories/registry";

export * from "@/lib/server/repositories/types";
export type { UserRepository } from "@/lib/server/repositories/user-repository";
export type { WorkspaceRepository } from "@/lib/server/repositories/workspace-repository";
export type { WorkspaceMemberRepository } from "@/lib/server/repositories/workspace-member-repository";
export type { CollectionRepository } from "@/lib/server/repositories/collection-repository";
export type { SchemaRepository } from "@/lib/server/repositories/schema-repository";
export type { RecordRepository } from "@/lib/server/repositories/record-repository";
export type { ApiKeyRepository } from "@/lib/server/repositories/api-key-repository";
