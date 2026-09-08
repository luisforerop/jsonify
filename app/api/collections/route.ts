import { repositories } from "@/lib/server/repositories";
import {
  createSluggedResponse,
  listResponse,
} from "@/lib/server/resource-handlers";
import { isCollectionInput } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return listResponse(() => repositories.collections.list());
}

export function POST(request: Request): Promise<Response> {
  return createSluggedResponse(request, isCollectionInput, ({ input, slug }) =>
    repositories.collections.create({
      workspaceId: String(input.workspaceId),
      name: String(input.name),
      slug,
      description:
        typeof input.description === "string" ? input.description : null,
      isPublic: input.isPublic === true,
    }),
  );
}
