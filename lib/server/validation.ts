import type { JsonSchema } from "@/lib/schema-builder";
import type { FormValues } from "@/lib/schema-form";
import { isValidScope } from "@/lib/server/api-keys";

export type WorkspaceInput = {
  name: string;
  ownerId: string;
};

export type CollectionInput = {
  name: string;
  workspaceId: string;
  description?: string;
  isPublic?: boolean;
};

export type SavedSchemaInput = {
  name: string;
  schema: JsonSchema;
  collectionId: string;
};

export type RecordInput = {
  collectionId: string;
  schemaId: string;
  payload: FormValues;
};

export type ApiKeyInput = {
  name: string;
  workspaceId: string;
  scopes: string[];
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isWorkspaceInput(value: unknown): value is WorkspaceInput {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.ownerId)
  );
}

/** Update payloads carry just the editable fields. */
export function isNamedUpdate(value: unknown): value is { name: string } {
  return isRecord(value) && isNonEmptyString(value.name);
}

export function isCollectionInput(value: unknown): value is CollectionInput {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.workspaceId) &&
    (value.description === undefined || typeof value.description === "string") &&
    (value.isPublic === undefined || typeof value.isPublic === "boolean")
  );
}

export function isSavedSchemaInput(value: unknown): value is SavedSchemaInput {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.collectionId) &&
    isRecord(value.schema)
  );
}

export function isRecordInput(value: unknown): value is RecordInput {
  return (
    isRecord(value) &&
    isNonEmptyString(value.collectionId) &&
    isNonEmptyString(value.schemaId) &&
    isRecord(value.payload)
  );
}

export function isApiKeyInput(value: unknown): value is ApiKeyInput {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.workspaceId) &&
    Array.isArray(value.scopes) &&
    value.scopes.length > 0 &&
    value.scopes.every((scope) => isValidScope(scope))
  );
}
