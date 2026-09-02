import {
  createResponse,
  listResponse,
} from "@/lib/server/collection-handlers";
import { isFormEntryInput } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return listResponse("formEntries");
}

export function POST(request: Request): Promise<Response> {
  return createResponse("formEntries", request, isFormEntryInput);
}
