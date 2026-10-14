import { repositories } from "@/lib/server/repositories";
import { requireUserId, unauthorizedResponse } from "@/lib/server/require-auth";
import { toSavedSchema } from "@/lib/server/saved-schema";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/schemas/[id]/sharing">,
): Promise<Response> {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const enabled = (body as { enabled?: unknown } | null)?.enabled;
  if (typeof enabled !== "boolean") {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Unknown and inaccessible schemas are indistinguishable (404).
  const schema = await repositories.schemas.findById(id);
  const collection = schema
    ? await repositories.collections.findById(schema.collectionId)
    : null;
  const membership = collection
    ? await repositories.workspaceMembers.findByWorkspaceAndUser(
        collection.workspaceId,
        userId,
      )
    : null;
  if (!schema || !membership) {
    return Response.json({ error: "Schema not found" }, { status: 404 });
  }

  const updated = await repositories.schemas.update(id, {
    sharingEnabled: enabled,
  });
  return updated
    ? Response.json(toSavedSchema(updated))
    : Response.json({ error: "Schema not found" }, { status: 404 });
}
