import {
  createResponse,
  listResponse,
} from "@/lib/server/collection-handlers";
import { isUserInput } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return listResponse("users");
}

export function POST(request: Request): Promise<Response> {
  return createResponse("users", request, isUserInput);
}
