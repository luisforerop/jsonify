import { drizzleRepositories } from "@/lib/server/repositories/drizzle";
import type { ApiKeyRepository } from "@/lib/server/repositories/api-key-repository";
import type { CollectionRepository } from "@/lib/server/repositories/collection-repository";
import type { RecordRepository } from "@/lib/server/repositories/record-repository";
import type { SchemaRepository } from "@/lib/server/repositories/schema-repository";
import type { UserRepository } from "@/lib/server/repositories/user-repository";
import type { WorkspaceMemberRepository } from "@/lib/server/repositories/workspace-member-repository";
import type { WorkspaceRepository } from "@/lib/server/repositories/workspace-repository";

export interface Repositories {
  users: UserRepository;
  workspaces: WorkspaceRepository;
  workspaceMembers: WorkspaceMemberRepository;
  collections: CollectionRepository;
  schemas: SchemaRepository;
  records: RecordRepository;
  apiKeys: ApiKeyRepository;
}

/**
 * The Drizzle wiring is the default. Importing it does not open a database
 * connection — `db/client` is lazy — so tests that swap in fakes via
 * `setRepositories()` never reach Postgres.
 */
let active: Repositories = drizzleRepositories;

export function getRepositories(): Repositories {
  return active;
}

/** Test seam: swap in fake repositories (whole or partial). */
export function setRepositories(overrides: Partial<Repositories>): void {
  active = { ...active, ...overrides };
}

/** Test seam: restore the default (Drizzle) wiring. */
export function resetRepositories(): void {
  active = drizzleRepositories;
}
