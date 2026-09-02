import {
  deleteResponse,
  updateResponse,
} from "@/lib/server/collection-handlers";
import { isCollectionInput } from "@/lib/server/validation";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/collections/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return updateResponse("collections", id, request, isCollectionInput);
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/collections/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return deleteResponse("collections", id);
}
