import { repositories } from "@/lib/server/repositories";
import {
  createSluggedResponse,
  listResponse,
} from "@/lib/server/resource-handlers";
import { isWorkspaceInput } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return listResponse((userId) => repositories.workspaces.listByOwner(userId));
}

export function POST(request: Request): Promise<Response> {
  return createSluggedResponse(
    request,
    isWorkspaceInput,
    ({ input, slug, userId }) =>
      repositories.workspaces.create({
        name: String(input.name),
        slug,
        ownerId: userId,
      }),
    { ownerId: true },
  );
}
