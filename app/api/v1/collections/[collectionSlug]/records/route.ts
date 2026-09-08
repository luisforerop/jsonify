import { corsJson, preflight } from "@/lib/server/cors";
import { repositories } from "@/lib/server/repositories";
import { resolvePublicContext } from "@/lib/server/public-api-context";
import { toPublicRecord } from "@/lib/server/public-record";
import {
  invalidPayloadResponse,
  validatePayload,
} from "@/lib/server/validate-payload";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ collectionSlug: string }> };

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/** Parse a positive-integer query param, falling back to `fallback` when absent or invalid. */
function positiveInt(raw: string | null, fallback: number): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function OPTIONS(): Response {
  return preflight();
}

export async function GET(
  request: Request,
  context: Context,
): Promise<Response> {
  const { collectionSlug } = await context.params;
  const resolved = await resolvePublicContext(request, collectionSlug, {
    schema: "none",
    action: "read",
  });
  if (!resolved.ok) return resolved.response;

  const [all, schemas] = await Promise.all([
    repositories.records.listByCollection(resolved.collection.id),
    repositories.schemas.listByCollection(resolved.collection.id),
  ]);
  const schemaName = new Map(schemas.map((row) => [row.id, row.name]));

  const params = new URL(request.url).searchParams;
  const page = positiveInt(params.get("page"), DEFAULT_PAGE);
  const limit = positiveInt(params.get("limit"), DEFAULT_LIMIT);
  const start = (page - 1) * limit;

  return corsJson({
    items: all
      .slice(start, start + limit)
      .map((row) => toPublicRecord(row, schemaName.get(row.schemaId) ?? "")),
    pagination: { total: all.length, page, limit },
  });
}

export async function POST(
  request: Request,
  context: Context,
): Promise<Response> {
  const { collectionSlug } = await context.params;
  const resolved = await resolvePublicContext(request, collectionSlug, {
    schema: "required",
    action: "write",
  });
  if (!resolved.ok) return resolved.response;

  const { workspace, collection, schema } = resolved;
  if (!schema) {
    return corsJson({ error: "Missing x-schema header" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return corsJson({ error: "Request body must be a JSON object" }, { status: 400 });
  }
  if (!isJsonObject(body)) {
    return corsJson({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const validation = validatePayload(schema, body);
  if (!validation.valid) return invalidPayloadResponse(validation);

  const record = await repositories.records.create({
    workspaceId: workspace.id,
    collectionId: collection.id,
    schemaId: schema.id,
    payload: body,
  });

  return corsJson(
    { data: toPublicRecord(record, schema.name), id: record.id },
    { status: 201 },
  );
}
