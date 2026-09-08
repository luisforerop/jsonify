import { DomainError, repositories } from "@/lib/server/repositories";
import {
  createResponse,
  listResponse,
} from "@/lib/server/resource-handlers";
import { isRecordInput } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return listResponse(() => repositories.records.list());
}

export function POST(request: Request): Promise<Response> {
  return createResponse(request, isRecordInput, async ({ input }) => {
    const collectionId = String(input.collectionId);
    const collection = await repositories.collections.findById(collectionId);
    if (!collection) {
      throw new DomainError("Collection not found");
    }
    return repositories.records.create({
      workspaceId: collection.workspaceId,
      collectionId,
      schemaId: String(input.schemaId),
      payload: input.payload as Record<string, unknown>,
    });
  });
}
