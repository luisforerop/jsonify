import type { JsonSchema } from "@/lib/schema-builder";
import { repositories } from "@/lib/server/repositories";
import {
  deleteResponse,
  updateResponse,
} from "@/lib/server/resource-handlers";
import { toSavedSchema } from "@/lib/server/saved-schema";
import { isSavedSchemaInput } from "@/lib/server/validation";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/schemas/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return updateResponse(request, isSavedSchemaInput, async ({ input }) => {
    const row = await repositories.schemas.update(id, {
      name: String(input.name),
      schemaDefinition: input.schema as JsonSchema,
    });
    return row ? toSavedSchema(row) : null;
  });
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/schemas/[id]">,
): Promise<Response> {
  const { id } = await context.params;
  return deleteResponse(() => repositories.schemas.delete(id));
}
