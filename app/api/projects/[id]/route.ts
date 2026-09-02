import {
  deleteResponse,
  updateResponse,
} from "@/lib/server/collection-handlers";
import { isProjectInput } from "@/lib/server/validation";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/projects/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return updateResponse("projects", id, request, isProjectInput);
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/projects/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return deleteResponse("projects", id);
}
