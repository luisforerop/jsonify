import {
  deleteResponse,
  updateResponse,
} from "@/lib/server/collection-handlers";
import { isUserInput } from "@/lib/server/validation";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/users/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return updateResponse("users", id, request, isUserInput);
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/users/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return deleteResponse("users", id);
}
