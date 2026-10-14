import { repositories } from "@/lib/server/repositories";
import {
  invalidPayloadResponse,
  validatePayload,
} from "@/lib/server/validate-payload";

export const dynamic = "force-dynamic";

/** Largest accepted request body, in bytes. */
const MAX_BODY_BYTES = 100 * 1024;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Context = RouteContext<"/api/public/forms/[schemaId]">;

async function findSchema(schemaId: string) {
  if (!UUID_RE.test(schemaId)) return null;
  return repositories.schemas.findById(schemaId);
}

const notFound = () =>
  Response.json({ error: "Form not found" }, { status: 404 });

const methodNotAllowed = () =>
  Response.json(
    { error: "Method not allowed" },
    { status: 405, headers: { Allow: "GET, POST" } },
  );

export async function GET(_request: Request, context: Context) {
  const { schemaId } = await context.params;
  const schema = await findSchema(schemaId);
  if (!schema) return notFound();
  if (!schema.sharingEnabled) return Response.json({ accepting: false });
  return Response.json({
    accepting: true,
    name: schema.name,
    schema: schema.schemaDefinition,
  });
}

export async function POST(request: Request, context: Context) {
  const { schemaId } = await context.params;
  const schema = await findSchema(schemaId);
  if (!schema) return notFound();
  if (!schema.sharingEnabled) {
    return Response.json(
      { error: "This form is not accepting responses" },
      { status: 403 },
    );
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return Response.json(
      { error: "Body must be a JSON object" },
      { status: 400 },
    );
  }

  const validation = validatePayload(schema, payload);
  if (!validation.valid) return invalidPayloadResponse(validation);

  const collection = await repositories.collections.findById(
    schema.collectionId,
  );
  if (!collection) return notFound();

  const record = await repositories.records.create({
    workspaceId: collection.workspaceId,
    collectionId: collection.id,
    schemaId: schema.id,
    payload: payload as Record<string, unknown>,
  });
  return Response.json({ id: record.id }, { status: 201 });
}

export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
