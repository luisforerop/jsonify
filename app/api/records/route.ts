import { DomainError, repositories } from "@/lib/server/repositories";
import { requireUserId, unauthorizedResponse } from "@/lib/server/require-auth";
import {
  createResponse,
  listResponse,
} from "@/lib/server/resource-handlers";
import { isRecordInput } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}

/**
 * Without `page` this keeps returning every record (legacy consumers). With
 * `page`, `collectionId` is required and one page of that collection's
 * records is returned, newest first.
 */
export async function GET(request?: Request): Promise<Response> {
  const params = request ? new URL(request.url).searchParams : null;
  if (!params || params.get("page") === null) {
    return listResponse(() => repositories.records.list());
  }

  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const collectionId = params.get("collectionId");
  if (!collectionId) {
    return Response.json(
      { error: "collectionId is required" },
      { status: 400 },
    );
  }

  // Unknown and inaccessible collections are indistinguishable (404).
  const collection = await repositories.collections.findById(collectionId);
  const membership = collection
    ? await repositories.workspaceMembers.findByWorkspaceAndUser(
        collection.workspaceId,
        userId,
      )
    : null;
  if (!collection || !membership) {
    return Response.json({ error: "Collection not found" }, { status: 404 });
  }

  const page = positiveInt(params.get("page"), 1);
  const pageSize = Math.min(
    positiveInt(params.get("pageSize"), DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );
  const result = await repositories.records.listPageByCollection(
    collectionId,
    {
      schemaId: params.get("schemaId") || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    },
  );
  return Response.json({ ...result, page, pageSize });
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
