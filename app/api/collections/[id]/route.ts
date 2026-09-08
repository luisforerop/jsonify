import { repositories } from "@/lib/server/repositories";
import type { CollectionPatch } from "@/lib/server/repositories";
import {
  deleteResponse,
  updateResponse,
} from "@/lib/server/resource-handlers";
import { isCollectionInput } from "@/lib/server/validation";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/collections/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return updateResponse(request, isCollectionInput, ({ input }) => {
    const patch: CollectionPatch = { name: String(input.name) };
    if (typeof input.description === "string") patch.description = input.description;
    if (typeof input.isPublic === "boolean") patch.isPublic = input.isPublic;
    return repositories.collections.update(id, patch);
  });
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/collections/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return deleteResponse(() => repositories.collections.delete(id));
}
