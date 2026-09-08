import { generateApiKey } from "@/lib/server/api-keys";
import { repositories } from "@/lib/server/repositories";
import type { ApiKey } from "@/lib/server/repositories";
import { requireUserId, unauthorizedResponse } from "@/lib/server/require-auth";
import { isApiKeyInput } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

const INVALID = Symbol("invalid-json");

async function parseBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return INVALID;
  }
}

/** The stored key metadata minus its hash — the shape the client hook expects. */
function maskKey(key: ApiKey) {
  return {
    id: key.id,
    name: key.name,
    workspaceId: key.workspaceId,
    keyPrefix: key.keyPrefix,
    scopes: key.scopes,
    lastUsedAt: key.lastUsedAt,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
  };
}

export async function GET(request: Request): Promise<Response> {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) {
    return Response.json(
      { error: "Missing workspaceId query param" },
      { status: 400 },
    );
  }

  const keys = await repositories.apiKeys.listByWorkspace(workspaceId);
  return Response.json(keys.map(maskKey));
}

export async function POST(request: Request): Promise<Response> {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const body = await parseBody(request);
  if (body === INVALID || !isApiKeyInput(body)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const workspace = await repositories.workspaces.findById(body.workspaceId);
  if (!workspace) {
    return Response.json({ error: "Workspace not found" }, { status: 400 });
  }

  const { key, keyHash, keyPrefix } = generateApiKey();
  const record = await repositories.apiKeys.create({
    name: body.name,
    workspaceId: body.workspaceId,
    keyHash,
    keyPrefix,
    scopes: body.scopes,
  });

  return Response.json({ ...maskKey(record), key }, { status: 201 });
}
