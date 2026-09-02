import {
  createResponse,
  listResponse,
} from "@/lib/server/collection-handlers";
import { isRecordInput } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return listResponse("records");
}

export function POST(request: Request): Promise<Response> {
  return createResponse("records", request, isRecordInput);
}
