import {
  createSluggedResponse,
  listResponse,
} from "@/lib/server/collection-handlers";
import { isWorkspaceInput } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return listResponse("workspaces", { ownerField: "ownerId" });
}

export function POST(request: Request): Promise<Response> {
  return createSluggedResponse(
    "workspaces",
    request,
    isWorkspaceInput,
    "ownerId",
    { ownerField: "ownerId" },
  );
}
