import { corsJson } from "@/lib/server/cors";
import { readStore, type StoredRecord } from "@/lib/server/json-store";
import type { StoredSchema } from "@/lib/server/validate-payload";

export type SchemaMode = "none" | "optional" | "required";

export type ResolvedPublicContext = {
  ok: true;
  workspace: StoredRecord;
  collection: StoredRecord;
  /** The selected schema, or `null` when `schema` mode is `"none"`. */
  schema: StoredSchema | null;
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
 * mutates the store.
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
  options: { schema: SchemaMode },
): Promise<PublicContextResult> {
  const workspaceId = request.headers.get("x-workspace-id");
  if (!workspaceId) {
    return fail({ error: "Missing x-workspace-id header" }, 400);
  }

  const store = await readStore();

  const workspace = store.workspaces.find((row) => row.id === workspaceId);
  if (!workspace) {
    return fail({ error: "Workspace not found" }, 404);
  }

  const collection = store.collections.find(
    (row) => row.slug === collectionSlug && row.workspaceId === workspace.id,
  );
  if (!collection) {
    return fail({ error: "Collection not found in this workspace" }, 404);
  }

  if (options.schema === "none") {
    return { ok: true, workspace, collection, schema: null };
  }

  const schemas = store.schemas.filter(
    (row) => row.collectionId === collection.id,
  ) as StoredSchema[];

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
