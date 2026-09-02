import {
  deleteResponse,
  updateResponse,
} from "@/lib/server/collection-handlers";
import { isSavedSchemaInput } from "@/lib/server/validation";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/schemas/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return updateResponse("schemas", id, request, isSavedSchemaInput);
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/schemas/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return deleteResponse("schemas", id);
}
