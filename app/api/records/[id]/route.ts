import {
  deleteResponse,
  updateResponse,
} from "@/lib/server/collection-handlers";
import { isRecordInput } from "@/lib/server/validation";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/records/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return updateResponse("records", id, request, isRecordInput);
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/records/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return deleteResponse("records", id);
}
