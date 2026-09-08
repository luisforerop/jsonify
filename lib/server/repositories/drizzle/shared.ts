import type { DomainError } from "@/lib/server/repositories/types";

/** Serialize a Drizzle `Date` column to the ISO string the HTTP layer returns. */
export function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export function isoOrNull(value: Date | string | null): string | null {
  return value === null ? null : iso(value);
}

type PgError = { code: string; constraint?: string };

function isPgError(error: unknown): error is PgError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

/**
 * Translate a Postgres write failure into a domain error. `23505` is a unique
 * violation, `23503` a foreign-key violation (a restrict delete). Anything else
 * is returned untouched so the caller rethrows it.
 */
export function translateWriteError(
  error: unknown,
  handlers: {
    unique?: (constraint?: string) => DomainError;
    foreignKey?: (constraint?: string) => DomainError;
  },
): unknown {
  if (isPgError(error)) {
    if (error.code === "23505" && handlers.unique) {
      return handlers.unique(error.constraint);
    }
    if (error.code === "23503" && handlers.foreignKey) {
      return handlers.foreignKey(error.constraint);
    }
  }
  return error;
}
