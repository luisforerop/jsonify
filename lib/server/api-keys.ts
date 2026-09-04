import { createHash, randomBytes } from "node:crypto";

const KEY_PREFIX = "jfy_";
const PREFIX_DISPLAY_LENGTH = 12;

const SCOPE_PATTERN =
  /^(\*|(read|write|delete):(\*|[a-z0-9]+(-[a-z0-9]+)*))$/;

export type ApiKeyAction = "read" | "write" | "delete";

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Generate a new raw API key plus its stored representation. The raw `key` is
 * returned once for the caller to display; only `keyHash` and `keyPrefix` are
 * meant to be persisted.
 */
export function generateApiKey(): {
  key: string;
  keyHash: string;
  keyPrefix: string;
} {
  const key = `${KEY_PREFIX}${randomBytes(16).toString("hex")}`;
  return {
    key,
    keyHash: hashApiKey(key),
    keyPrefix: key.slice(0, PREFIX_DISPLAY_LENGTH),
  };
}

export function isValidScope(scope: unknown): scope is string {
  return typeof scope === "string" && SCOPE_PATTERN.test(scope);
}

/** Whether `scopes` grants `action` on the collection identified by `collectionSlug`. */
export function hasScope(
  scopes: string[],
  action: ApiKeyAction,
  collectionSlug: string,
): boolean {
  return scopes.some(
    (scope) =>
      scope === "*" ||
      scope === `${action}:*` ||
      scope === `${action}:${collectionSlug}`,
  );
}
