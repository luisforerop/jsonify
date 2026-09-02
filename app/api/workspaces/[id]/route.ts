import {
  deleteResponse,
  updateResponse,
} from "@/lib/server/collection-handlers";
import { isWorkspaceInput } from "@/lib/server/validation";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/workspaces/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return updateResponse("workspaces", id, request, isWorkspaceInput);
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/workspaces/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return deleteResponse("workspaces", id);
}
