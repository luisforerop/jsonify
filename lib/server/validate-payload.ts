import Ajv2020, { type ValidateFunction } from "ajv/dist/2020";

import { corsJson } from "@/lib/server/cors";
import type { SchemaRow } from "@/lib/server/repositories";

/** A saved schema row, whose `schemaDefinition` holds the JSON Schema document. */
export type StoredSchema = SchemaRow;

export type PayloadValidation =
  | { valid: true }
  | { valid: false; reason: "invalid"; details: string[] }
  | { valid: false; reason: "uncompilable-schema"; details: string[] };

/**
 * `strict: false` — builder output carries `$schema`/`title` and can omit
 * `properties` on empty objects, which strict mode rejects.
 * `allErrors: true` — report every violation, not only the first.
 */
const ajv = new Ajv2020({ strict: false, allErrors: true });

/** Compiled validators keyed by schema id + `updatedAt`, so edits invalidate. */
const validators = new Map<string, ValidateFunction>();

function compiledValidator(storedSchema: StoredSchema): ValidateFunction | null {
  const key = `${storedSchema.id}:${storedSchema.updatedAt}`;
  const cached = validators.get(key);
  if (cached) return cached;

  try {
    const validate = ajv.compile(storedSchema.schemaDefinition);
    validators.set(key, validate);
    return validate;
  } catch {
    return null;
  }
}

function formatErrors(validate: ValidateFunction): string[] {
  return (validate.errors ?? []).map((error) => {
    const location = error.instancePath || "/";
    return `${location} ${error.message ?? "is invalid"}`.trim();
  });
}

/**
 * Validate a request payload against a stored schema. Returns `valid: true`, or
 * `valid: false` with `reason: "invalid"` (payload does not conform) or
 * `reason: "uncompilable-schema"` (the stored schema itself cannot be compiled).
 */
export function validatePayload(
  storedSchema: StoredSchema,
  value: unknown,
): PayloadValidation {
  const validate = compiledValidator(storedSchema);
  if (!validate) {
    return {
      valid: false,
      reason: "uncompilable-schema",
      details: ["The stored schema for this collection is not valid JSON Schema."],
    };
  }

  if (validate(value)) return { valid: true };
  return { valid: false, reason: "invalid", details: formatErrors(validate) };
}

/**
 * The error `Response` for a failed `validatePayload` result: `400` for a
 * non-conforming payload, `422` when the stored schema itself is not compilable.
 */
export function invalidPayloadResponse(
  validation: Extract<PayloadValidation, { valid: false }>,
): Response {
  const uncompilable = validation.reason === "uncompilable-schema";
  return corsJson(
    {
      error: uncompilable ? "Stored schema is invalid" : "Validation failed",
      details: validation.details,
    },
    { status: uncompilable ? 422 : 400 },
  );
}
