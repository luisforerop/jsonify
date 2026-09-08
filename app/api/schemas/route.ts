import type { JsonSchema } from "@/lib/schema-builder";
import { repositories } from "@/lib/server/repositories";
import {
  createResponse,
  listResponse,
} from "@/lib/server/resource-handlers";
import { toSavedSchema } from "@/lib/server/saved-schema";
import { isSavedSchemaInput } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return listResponse(async () =>
    (await repositories.schemas.list()).map(toSavedSchema),
  );
}

export function POST(request: Request): Promise<Response> {
  return createResponse(request, isSavedSchemaInput, async ({ input }) =>
    toSavedSchema(
      await repositories.schemas.create({
        collectionId: String(input.collectionId),
        name: String(input.name),
        schemaDefinition: input.schema as JsonSchema,
      }),
    ),
  );
}
