import type { JsonSchema } from "@/lib/schema-builder";

/**
 * Domain row types returned by every repository. These are plain objects, not
 * Drizzle model instances: timestamps are ISO strings (as the HTTP layer and
 * the client hooks expect), never `Date`.
 */

export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type UserProfileInput = {
  name: string;
  email: string;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type NewWorkspace = {
  name: string;
  slug: string;
  ownerId: string;
};

export type WorkspacePatch = {
  name?: string;
  slug?: string;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export type NewWorkspaceMember = {
  workspaceId: string;
  userId: string;
  role?: string;
};

export type Collection = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NewCollection = {
  workspaceId: string;
  name: string;
  slug: string;
  description?: string | null;
  isPublic?: boolean;
};

export type CollectionPatch = {
  name?: string;
  slug?: string;
  description?: string | null;
  isPublic?: boolean;
};

export type ApiKey = {
  id: string;
  workspaceId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewApiKey = {
  workspaceId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: string[];
};

export type SchemaRow = {
  id: string;
  collectionId: string;
  name: string;
  schemaDefinition: JsonSchema;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NewSchema = {
  collectionId: string;
  name: string;
  schemaDefinition: JsonSchema;
  isActive?: boolean;
};

export type SchemaPatch = {
  name?: string;
  schemaDefinition?: JsonSchema;
  isActive?: boolean;
};

export type RecordRow = {
  id: string;
  workspaceId: string;
  collectionId: string;
  schemaId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type NewRecord = {
  workspaceId: string;
  collectionId: string;
  schemaId: string;
  payload: Record<string, unknown>;
};

export type RecordPatch = {
  schemaId?: string;
  payload?: Record<string, unknown>;
};

/* ---------------------------------------------------------------- errors --- */

/** Base for every error a repository raises for a caller-recoverable condition. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** A slug collides with an existing sibling (workspace or collection). */
export class DuplicateSlugError extends DomainError {
  constructor(public readonly slug: string) {
    super(`The slug "${slug}" is already taken here.`);
  }
}

/** A schema name collides with another schema in the same collection. */
export class DuplicateSchemaNameError extends DomainError {
  constructor(public readonly schemaName: string) {
    super(`A schema named "${schemaName}" already exists in this collection.`);
  }
}

/** An API key hash collides (effectively never — a generation retry case). */
export class DuplicateApiKeyError extends DomainError {
  constructor() {
    super("That API key already exists.");
  }
}

/** A user already has a membership row for the workspace. */
export class DuplicateMemberError extends DomainError {
  constructor() {
    super("That user is already a member of this workspace.");
  }
}

/** A delete was refused by a restrict foreign key (schema in use, user owns workspaces). */
export class ResourceInUseError extends DomainError {
  constructor(message = "This resource is still referenced and cannot be deleted.") {
    super(message);
  }
}
