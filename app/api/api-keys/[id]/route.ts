import { deleteResponse } from "@/lib/server/collection-handlers";

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/api-keys/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return deleteResponse("apiKeys", id);
}
