import { repositories } from "@/lib/server/repositories";
import { deleteResponse } from "@/lib/server/resource-handlers";

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/api-keys/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return deleteResponse(() => repositories.apiKeys.delete(id));
}
