import {
  createResponse,
  listResponse,
} from "@/lib/server/collection-handlers";
import { isProjectInput } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return listResponse("projects");
}

export function POST(request: Request): Promise<Response> {
  return createResponse("projects", request, isProjectInput);
}
