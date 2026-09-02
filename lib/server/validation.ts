import type { JsonSchema } from "@/lib/schema-builder";
import type { FormValues } from "@/lib/schema-form";

export type ProjectInput = {
  name: string;
};

export type SavedSchemaInput = {
  name: string;
  schema: JsonSchema;
  projectId: string;
};

export type FormEntryInput = {
  name: string;
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

export function isProjectInput(value: unknown): value is ProjectInput {
  return isRecord(value) && isNonEmptyString(value.name);
}

export function isSavedSchemaInput(value: unknown): value is SavedSchemaInput {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.projectId) &&
    isRecord(value.schema)
  );
}

export function isFormEntryInput(value: unknown): value is FormEntryInput {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.schemaId) &&
    isNonEmptyString(value.schemaName) &&
    isRecord(value.values)
  );
}
