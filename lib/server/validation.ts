import type { JsonSchema } from "@/lib/schema-builder";
import type { FormValues } from "@/lib/schema-form";

export type UserInput = {
  name: string;
  email: string;
  password: string;
};

export type WorkspaceInput = {
  name: string;
  ownerId: string;
};

export type CollectionInput = {
  name: string;
  workspaceId: string;
  description?: string;
};

export type SavedSchemaInput = {
  name: string;
  schema: JsonSchema;
  workspaceId: string;
  collectionId: string;
};

export type RecordInput = {
  name: string;
  collectionId: string;
  schemaId: string;
  schemaName: string;
  values: FormValues;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isUserInput(value: unknown): value is UserInput {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.email) &&
    isNonEmptyString(value.password)
  );
}

export function isWorkspaceInput(value: unknown): value is WorkspaceInput {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.ownerId)
  );
}

export function isCollectionInput(value: unknown): value is CollectionInput {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.workspaceId) &&
    (value.description === undefined || typeof value.description === "string")
  );
}

export function isSavedSchemaInput(value: unknown): value is SavedSchemaInput {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.workspaceId) &&
    isNonEmptyString(value.collectionId) &&
    isRecord(value.schema)
  );
}

export function isRecordInput(value: unknown): value is RecordInput {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.collectionId) &&
    isNonEmptyString(value.schemaId) &&
    isNonEmptyString(value.schemaName) &&
    isRecord(value.values)
  );
}
