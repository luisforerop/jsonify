import {
  createSluggedResponse,
  listResponse,
} from "@/lib/server/collection-handlers";
import { isCollectionInput } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return listResponse("collections");
}

export function POST(request: Request): Promise<Response> {
  return createSluggedResponse(
    "collections",
    request,
    isCollectionInput,
    "workspaceId",
  );
}
