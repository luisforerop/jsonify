import { randomUUID } from "node:crypto";

import type { Repositories } from "@/lib/server/repositories/registry";
import {
  DuplicateApiKeyError,
  DuplicateMemberError,
  DuplicateSchemaNameError,
  DuplicateSlugError,
  ResourceInUseError,
  type ApiKey,
  type Collection,
  type RecordRow,
  type SchemaRow,
  type User,
  type Workspace,
  type WorkspaceMember,
} from "@/lib/server/repositories/types";

/**
 * In-memory repositories for tests. They enforce the same constraints the
 * database does (unique slug / schema name / key hash, one member per
 * workspace+user, cascade on workspace/collection delete, restrict on a schema
 * with records) so route/context tests exercise the real error paths without a
 * Postgres.
 */
export function makeFakeRepositories(): Repositories & {
  /** Direct access to the backing arrays for seeding/asserting in tests. */
  _tables: {
    users: User[];
    workspaces: Workspace[];
    workspaceMembers: WorkspaceMember[];
    collections: Collection[];
    schemas: SchemaRow[];
    records: RecordRow[];
    apiKeys: ApiKey[];
  };
} {
  const users: User[] = [];
  const workspaces: Workspace[] = [];
  const workspaceMembers: WorkspaceMember[] = [];
  const collections: Collection[] = [];
  const schemas: SchemaRow[] = [];
  const records: RecordRow[] = [];
  const apiKeys: ApiKey[] = [];

  const now = () => new Date().toISOString();
  const stamp = () => {
    const t = now();
    return { createdAt: t, updatedAt: t };
  };

  return {
    _tables: {
      users,
      workspaces,
      workspaceMembers,
      collections,
      schemas,
      records,
      apiKeys,
    },

    users: {
      async findById(id) {
        return users.find((u) => u.id === id) ?? null;
      },
      async upsert(id, profile) {
        const existing = users.find((u) => u.id === id);
        if (existing) {
          existing.name = profile.name;
          existing.email = profile.email;
          existing.updatedAt = now();
          return existing;
        }
        const user: User = { id, ...profile, ...stamp() };
        users.push(user);
        return user;
      },
    },

    workspaces: {
      async findById(id) {
        return workspaces.find((w) => w.id === id) ?? null;
      },
      async findBySlug(ownerId, slug) {
        return (
          workspaces.find((w) => w.ownerId === ownerId && w.slug === slug) ??
          null
        );
      },
      async listByOwner(ownerId) {
        return workspaces.filter((w) => w.ownerId === ownerId);
      },
      async create(input) {
        if (
          workspaces.some(
            (w) => w.ownerId === input.ownerId && w.slug === input.slug,
          )
        ) {
          throw new DuplicateSlugError(input.slug);
        }
        const workspace: Workspace = {
          id: randomUUID(),
          name: input.name,
          slug: input.slug,
          ownerId: input.ownerId,
          ...stamp(),
        };
        workspaces.push(workspace);
        workspaceMembers.push({
          id: randomUUID(),
          workspaceId: workspace.id,
          userId: input.ownerId,
          role: "owner",
          ...stamp(),
        });
        return workspace;
      },
      async update(id, patch) {
        const workspace = workspaces.find((w) => w.id === id);
        if (!workspace) return null;
        Object.assign(workspace, patch, { updatedAt: now() });
        return workspace;
      },
      async delete(id) {
        const index = workspaces.findIndex((w) => w.id === id);
        if (index === -1) return false;
        workspaces.splice(index, 1);
        cascadeFromWorkspace(id);
        return true;
      },
    },

    workspaceMembers: {
      async listByWorkspace(workspaceId) {
        return workspaceMembers.filter((m) => m.workspaceId === workspaceId);
      },
      async listByUser(userId) {
        return workspaceMembers.filter((m) => m.userId === userId);
      },
      async findByWorkspaceAndUser(workspaceId, userId) {
        return (
          workspaceMembers.find(
            (m) => m.workspaceId === workspaceId && m.userId === userId,
          ) ?? null
        );
      },
      async create(input) {
        if (
          workspaceMembers.some(
            (m) =>
              m.workspaceId === input.workspaceId && m.userId === input.userId,
          )
        ) {
          throw new DuplicateMemberError();
        }
        const member: WorkspaceMember = {
          id: randomUUID(),
          workspaceId: input.workspaceId,
          userId: input.userId,
          role: input.role ?? "member",
          ...stamp(),
        };
        workspaceMembers.push(member);
        return member;
      },
      async delete(id) {
        const index = workspaceMembers.findIndex((m) => m.id === id);
        if (index === -1) return false;
        workspaceMembers.splice(index, 1);
        return true;
      },
    },

    collections: {
      async findById(id) {
        return collections.find((c) => c.id === id) ?? null;
      },
      async findBySlug(workspaceId, slug) {
        return (
          collections.find(
            (c) => c.workspaceId === workspaceId && c.slug === slug,
          ) ?? null
        );
      },
      async listByWorkspace(workspaceId) {
        return collections.filter((c) => c.workspaceId === workspaceId);
      },
      async list() {
        return [...collections];
      },
      async create(input) {
        if (
          collections.some(
            (c) => c.workspaceId === input.workspaceId && c.slug === input.slug,
          )
        ) {
          throw new DuplicateSlugError(input.slug);
        }
        const collection: Collection = {
          id: randomUUID(),
          workspaceId: input.workspaceId,
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          isPublic: input.isPublic ?? false,
          ...stamp(),
        };
        collections.push(collection);
        return collection;
      },
      async update(id, patch) {
        const collection = collections.find((c) => c.id === id);
        if (!collection) return null;
        Object.assign(collection, patch, { updatedAt: now() });
        return collection;
      },
      async delete(id) {
        const index = collections.findIndex((c) => c.id === id);
        if (index === -1) return false;
        collections.splice(index, 1);
        cascadeFromCollection(id);
        return true;
      },
    },

    schemas: {
      async findById(id) {
        return schemas.find((s) => s.id === id) ?? null;
      },
      async findByNameOrId(collectionId, ref) {
        return (
          schemas.find(
            (s) => s.collectionId === collectionId && s.name === ref,
          ) ??
          schemas.find(
            (s) => s.collectionId === collectionId && s.id === ref,
          ) ??
          null
        );
      },
      async listByCollection(collectionId) {
        return schemas.filter((s) => s.collectionId === collectionId);
      },
      async list() {
        return [...schemas];
      },
      async create(input) {
        if (
          schemas.some(
            (s) => s.collectionId === input.collectionId && s.name === input.name,
          )
        ) {
          throw new DuplicateSchemaNameError(input.name);
        }
        const schema: SchemaRow = {
          id: randomUUID(),
          collectionId: input.collectionId,
          name: input.name,
          schemaDefinition: input.schemaDefinition,
          isActive: input.isActive ?? true,
          ...stamp(),
        };
        schemas.push(schema);
        return schema;
      },
      async update(id, patch) {
        const schema = schemas.find((s) => s.id === id);
        if (!schema) return null;
        Object.assign(schema, patch, { updatedAt: now() });
        return schema;
      },
      async delete(id) {
        if (records.some((r) => r.schemaId === id)) {
          throw new ResourceInUseError();
        }
        const index = schemas.findIndex((s) => s.id === id);
        if (index === -1) return false;
        schemas.splice(index, 1);
        return true;
      },
    },

    records: {
      async findById(id) {
        return records.find((r) => r.id === id) ?? null;
      },
      async listByCollection(collectionId) {
        return records.filter((r) => r.collectionId === collectionId);
      },
      async list() {
        return [...records];
      },
      async create(input) {
        const record: RecordRow = {
          id: randomUUID(),
          workspaceId: input.workspaceId,
          collectionId: input.collectionId,
          schemaId: input.schemaId,
          payload: input.payload,
          ...stamp(),
        };
        records.push(record);
        return record;
      },
      async update(id, patch) {
        const record = records.find((r) => r.id === id);
        if (!record) return null;
        Object.assign(record, patch, { updatedAt: now() });
        return record;
      },
      async delete(id) {
        const index = records.findIndex((r) => r.id === id);
        if (index === -1) return false;
        records.splice(index, 1);
        return true;
      },
    },

    apiKeys: {
      async findById(id) {
        return apiKeys.find((k) => k.id === id) ?? null;
      },
      async findByHash(keyHash, workspaceId) {
        return (
          apiKeys.find(
            (k) => k.keyHash === keyHash && k.workspaceId === workspaceId,
          ) ?? null
        );
      },
      async listByWorkspace(workspaceId) {
        return apiKeys.filter((k) => k.workspaceId === workspaceId);
      },
      async create(input) {
        if (apiKeys.some((k) => k.keyHash === input.keyHash)) {
          throw new DuplicateApiKeyError();
        }
        const key: ApiKey = {
          id: randomUUID(),
          workspaceId: input.workspaceId,
          name: input.name,
          keyHash: input.keyHash,
          keyPrefix: input.keyPrefix,
          scopes: input.scopes,
          lastUsedAt: null,
          ...stamp(),
        };
        apiKeys.push(key);
        return key;
      },
      async delete(id) {
        const index = apiKeys.findIndex((k) => k.id === id);
        if (index === -1) return false;
        apiKeys.splice(index, 1);
        return true;
      },
      async touchLastUsed(id) {
        const key = apiKeys.find((k) => k.id === id);
        if (key) key.lastUsedAt = now();
      },
    },
  };

  function cascadeFromCollection(collectionId: string): void {
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].collectionId === collectionId) records.splice(i, 1);
    }
    for (let i = schemas.length - 1; i >= 0; i--) {
      if (schemas[i].collectionId === collectionId) schemas.splice(i, 1);
    }
  }

  function cascadeFromWorkspace(workspaceId: string): void {
    for (const collection of collections.filter(
      (c) => c.workspaceId === workspaceId,
    )) {
      cascadeFromCollection(collection.id);
    }
    for (let i = collections.length - 1; i >= 0; i--) {
      if (collections[i].workspaceId === workspaceId) collections.splice(i, 1);
    }
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].workspaceId === workspaceId) records.splice(i, 1);
    }
    for (let i = apiKeys.length - 1; i >= 0; i--) {
      if (apiKeys[i].workspaceId === workspaceId) apiKeys.splice(i, 1);
    }
    for (let i = workspaceMembers.length - 1; i >= 0; i--) {
      if (workspaceMembers[i].workspaceId === workspaceId) {
        workspaceMembers.splice(i, 1);
      }
    }
  }
}
