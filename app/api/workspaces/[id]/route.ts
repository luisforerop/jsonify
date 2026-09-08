import { repositories } from "@/lib/server/repositories";
import {
  deleteResponse,
  updateResponse,
} from "@/lib/server/resource-handlers";
import { isNamedUpdate } from "@/lib/server/validation";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/workspaces/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return updateResponse(request, isNamedUpdate, ({ input }) =>
    repositories.workspaces.update(id, { name: String(input.name) }),
  );
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/workspaces/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return deleteResponse(() => repositories.workspaces.delete(id));
}
