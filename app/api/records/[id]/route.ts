import { repositories } from "@/lib/server/repositories";
import {
  deleteResponse,
  updateResponse,
} from "@/lib/server/resource-handlers";
import { isRecordInput } from "@/lib/server/validation";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/records/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return updateResponse(request, isRecordInput, ({ input }) =>
    repositories.records.update(id, {
      schemaId: String(input.schemaId),
      payload: input.payload as Record<string, unknown>,
    }),
  );
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/records/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return deleteResponse(() => repositories.records.delete(id));
}
