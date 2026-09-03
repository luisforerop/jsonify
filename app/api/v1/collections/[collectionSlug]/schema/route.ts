import { corsJson, preflight } from "@/lib/server/cors";
import { resolvePublicContext } from "@/lib/server/public-api-context";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ collectionSlug: string }> };

export function OPTIONS(): Response {
  return preflight();
}

export async function GET(
  request: Request,
  context: Context,
): Promise<Response> {
  const { collectionSlug } = await context.params;
  const resolved = await resolvePublicContext(request, collectionSlug, {
    schema: "optional",
  });
  if (!resolved.ok) return resolved.response;

  // `schema` mode "optional" always resolves a schema on success (or fails).
  return corsJson({ schema: resolved.schema?.schema ?? null });
}
