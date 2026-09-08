import { hasScope, hashApiKey, type ApiKeyAction } from "@/lib/server/api-keys";
import { corsJson } from "@/lib/server/cors";
import { repositories } from "@/lib/server/repositories";
import type {
  Collection,
  SchemaRow,
  Workspace,
} from "@/lib/server/repositories";

export type SchemaMode = "none" | "optional" | "required";

export type ResolvedPublicContext = {
  ok: true;
  workspace: Workspace;
  collection: Collection;
  /** The selected schema, or `null` when `schema` mode is `"none"`. */
  schema: SchemaRow | null;
};

export type PublicContextResult =
  | ResolvedPublicContext
  | { ok: false; response: Response };

function fail(body: unknown, status: number): { ok: false; response: Response } {
  return { ok: false, response: corsJson(body, { status }) };
}

/**
 * Resolve a public `/api/v1` request into its `{ workspace, collection, schema }`
 * context from the `x-workspace-id` / `x-schema` headers and the collection slug
 * in the path. Fails fast with a ready-to-return error `Response` and never
 * mutates state (beyond a best-effort `last_used_at` touch on the API key).
 *
 * `schema` mode:
 * - `"none"`: skip schema resolution (`schema` is `null`).
 * - `"required"`: `x-schema` must be present (used by record writes).
 * - `"optional"`: `x-schema` may be omitted; falls back to the collection's only
 *   schema, or `400` when the collection has more than one.
 */
export async function resolvePublicContext(
  request: Request,
  collectionSlug: string,
  options: { schema: SchemaMode; action: ApiKeyAction },
): Promise<PublicContextResult> {
  const workspaceId = request.headers.get("x-workspace-id");
  if (!workspaceId) {
    return fail({ error: "Missing x-workspace-id header" }, 400);
  }

  const workspace = await repositories.workspaces.findById(workspaceId);
  if (!workspace) {
    return fail({ error: "Workspace not found" }, 404);
  }

  const collection = await repositories.collections.findBySlug(
    workspace.id,
    collectionSlug,
  );
  if (!collection) {
    return fail({ error: "Collection not found in this workspace" }, 404);
  }

  const isPublicRead = options.action === "read" && collection.isPublic === true;
  if (!isPublicRead) {
    const authHeader = request.headers.get("authorization");
    const presentedKey = authHeader?.match(/^Bearer (.+)$/)?.[1];
    if (!presentedKey) {
      return fail({ error: "Missing API key" }, 401);
    }

    const keyHash = hashApiKey(presentedKey);
    const apiKey = await repositories.apiKeys.findByHash(keyHash, workspace.id);
    if (!apiKey) {
      return fail({ error: "Invalid API key" }, 401);
    }

    if (!hasScope(apiKey.scopes, options.action, collectionSlug)) {
      return fail({ error: "API key missing required scope" }, 403);
    }

    void repositories.apiKeys.touchLastUsed(apiKey.id);
  }

  if (options.schema === "none") {
    return { ok: true, workspace, collection, schema: null };
  }

  const schemas = await repositories.schemas.listByCollection(collection.id);

  if (schemas.length === 0) {
    return fail(
      { error: "Create a schema for this collection before using this endpoint" },
      409,
    );
  }

  const requested = request.headers.get("x-schema");
  if (requested) {
    const match =
      schemas.find((row) => row.name === requested) ??
      schemas.find((row) => row.id === requested);
    if (!match) {
      return fail(
        {
          error: `No schema named or identified by "${requested}" in this collection`,
        },
        404,
      );
    }
    return { ok: true, workspace, collection, schema: match };
  }

  if (options.schema === "required") {
    return fail({ error: "Missing x-schema header" }, 400);
  }

  if (schemas.length > 1) {
    return fail(
      {
        error: "This collection has more than one schema; send an x-schema header",
        schemas: schemas.map((row) => row.name),
      },
      400,
    );
  }

  return { ok: true, workspace, collection, schema: schemas[0] };
}
