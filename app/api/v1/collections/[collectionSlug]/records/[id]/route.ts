import { corsJson, preflight } from "@/lib/server/cors";
import {
  listCollection,
  removeRecord,
  updateRecord,
  type StoredRecord,
} from "@/lib/server/json-store";
import { resolvePublicContext } from "@/lib/server/public-api-context";
import { toPublicRecord } from "@/lib/server/public-record";
import {
  invalidPayloadResponse,
  validatePayload,
} from "@/lib/server/validate-payload";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ collectionSlug: string; id: string }> };

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Find a record by id that also belongs to the given collection. */
async function findRecord(
  collectionId: string,
  id: string,
): Promise<StoredRecord | undefined> {
  return (await listCollection("records")).find(
    (row) => row.id === id && row.collectionId === collectionId,
  );
}

export function OPTIONS(): Response {
  return preflight();
}

export async function GET(
  request: Request,
  context: Context,
): Promise<Response> {
  const { collectionSlug, id } = await context.params;
  const resolved = await resolvePublicContext(request, collectionSlug, {
    schema: "none",
    action: "read",
  });
  if (!resolved.ok) return resolved.response;

  const record = await findRecord(resolved.collection.id, id);
  if (!record) return corsJson({ error: "Record not found" }, { status: 404 });

  return corsJson({ data: toPublicRecord(record) });
}

export async function PUT(
  request: Request,
  context: Context,
): Promise<Response> {
  const { collectionSlug, id } = await context.params;
  const resolved = await resolvePublicContext(request, collectionSlug, {
    schema: "required",
    action: "write",
  });
  if (!resolved.ok) return resolved.response;

  const { schema } = resolved;
  if (!schema) {
    return corsJson({ error: "Missing x-schema header" }, { status: 400 });
  }

  const record = await findRecord(resolved.collection.id, id);
  if (!record) return corsJson({ error: "Record not found" }, { status: 404 });

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

  const updated = await updateRecord("records", id, { values: body });
  if (!updated) return corsJson({ error: "Record not found" }, { status: 404 });

  return corsJson({ data: toPublicRecord(updated) });
}

export async function DELETE(
  request: Request,
  context: Context,
): Promise<Response> {
  const { collectionSlug, id } = await context.params;
  const resolved = await resolvePublicContext(request, collectionSlug, {
    schema: "none",
    action: "delete",
  });
  if (!resolved.ok) return resolved.response;

  const record = await findRecord(resolved.collection.id, id);
  if (!record) return corsJson({ error: "Record not found" }, { status: 404 });

  await removeRecord("records", id);
  return corsJson({ success: true });
}
