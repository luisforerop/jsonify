import {
  createResponse,
  listResponse,
} from "@/lib/server/collection-handlers";
import { isSavedSchemaInput } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return listResponse("schemas");
}

export function POST(request: Request): Promise<Response> {
  return createResponse("schemas", request, isSavedSchemaInput);
}
