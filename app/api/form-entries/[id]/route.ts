import {
  deleteResponse,
  updateResponse,
} from "@/lib/server/collection-handlers";
import { isFormEntryInput } from "@/lib/server/validation";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/form-entries/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return updateResponse("formEntries", id, request, isFormEntryInput);
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/form-entries/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return deleteResponse("formEntries", id);
}
