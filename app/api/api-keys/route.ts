import { generateApiKey } from "@/lib/server/api-keys";
import { createRecord, listCollection, readStore } from "@/lib/server/json-store";
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

function maskKey(record: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(record)) {
    if (field !== "keyHash") masked[field] = value;
  }
  return masked;
}

export async function GET(request: Request): Promise<Response> {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) {
    return Response.json(
      { error: "Missing workspaceId query param" },
      { status: 400 },
    );
  }

  const keys = (await listCollection("apiKeys")).filter(
    (key) => key.workspaceId === workspaceId,
  );
  return Response.json(keys.map(maskKey));
}

export async function POST(request: Request): Promise<Response> {
  const body = await parseBody(request);
  if (body === INVALID || !isApiKeyInput(body)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const store = await readStore();
  const workspace = store.workspaces.find((row) => row.id === body.workspaceId);
  if (!workspace) {
    return Response.json({ error: "Workspace not found" }, { status: 400 });
  }

  const { key, keyHash, keyPrefix } = generateApiKey();
  const record = await createRecord("apiKeys", {
    name: body.name,
    workspaceId: body.workspaceId,
    keyHash,
    keyPrefix,
    scopes: body.scopes,
    lastUsedAt: null,
  });

  return Response.json({ ...maskKey(record), key }, { status: 201 });
}
