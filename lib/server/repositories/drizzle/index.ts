import { drizzleApiKeyRepository } from "@/lib/server/repositories/drizzle/api-key-repository";
import { drizzleCollectionRepository } from "@/lib/server/repositories/drizzle/collection-repository";
import { drizzleRecordRepository } from "@/lib/server/repositories/drizzle/record-repository";
import { drizzleSchemaRepository } from "@/lib/server/repositories/drizzle/schema-repository";
import { drizzleUserRepository } from "@/lib/server/repositories/drizzle/user-repository";
import { drizzleWorkspaceMemberRepository } from "@/lib/server/repositories/drizzle/workspace-member-repository";
import { drizzleWorkspaceRepository } from "@/lib/server/repositories/drizzle/workspace-repository";

/** The production wiring: every repository backed by Drizzle + Postgres. */
export const drizzleRepositories = {
  users: drizzleUserRepository,
  workspaces: drizzleWorkspaceRepository,
  workspaceMembers: drizzleWorkspaceMemberRepository,
  collections: drizzleCollectionRepository,
  schemas: drizzleSchemaRepository,
  records: drizzleRecordRepository,
  apiKeys: drizzleApiKeyRepository,
};
