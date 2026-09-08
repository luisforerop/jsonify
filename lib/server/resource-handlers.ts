import {
  DomainError,
  DuplicateSlugError,
  ResourceInUseError,
} from "@/lib/server/repositories";
import { requireUserId, unauthorizedResponse } from "@/lib/server/require-auth";
import { slugify } from "@/lib/server/slug";

type InputGuard = (value: unknown) => boolean;

const INVALID = Symbol("invalid-json");

async function parseBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return INVALID;
  }
}

/** Map a repository domain error to its HTTP response, or `null` to rethrow. */
function domainErrorResponse(error: unknown): Response | null {
  if (error instanceof DuplicateSlugError) {
    return Response.json(
      { error: "That name is already taken here" },
      { status: 400 },
    );
  }
  if (error instanceof ResourceInUseError) {
    return Response.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof DomainError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  return null;
}

export async function listResponse<T>(
  load: (userId: string) => Promise<T[]>,
): Promise<Response> {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();
  return Response.json(await load(userId));
}

type CreateContext = {
  input: Record<string, unknown>;
  userId: string;
};

export async function createResponse<T>(
  request: Request,
  isValidInput: InputGuard,
  create: (context: CreateContext) => Promise<T>,
): Promise<Response> {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const body = await parseBody(request);
  if (body === INVALID || !isValidInput(body)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const record = await create({
      input: body as Record<string, unknown>,
      userId,
    });
    return Response.json(record, { status: 201 });
  } catch (error) {
    const mapped = domainErrorResponse(error);
    if (mapped) return mapped;
    throw error;
  }
}

type SluggedCreateContext = CreateContext & { slug: string };

/**
 * Create a record that carries a generated `slug`. The `create` callback runs
 * the repository insert; a `DuplicateSlugError` it raises becomes a 400.
 * `options.ownerId` forces the `ownerId` field on the validated input.
 */
export async function createSluggedResponse<T>(
  request: Request,
  isValidInput: InputGuard,
  create: (context: SluggedCreateContext) => Promise<T>,
  options: { ownerId?: boolean } = {},
): Promise<Response> {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const body = await parseBody(request);
  if (body === INVALID) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  const input = options.ownerId
    ? { ...(body as Record<string, unknown>), ownerId: userId }
    : (body as Record<string, unknown>);
  if (!isValidInput(input)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const slug = slugify(String(input.name));
  if (!slug) {
    return Response.json(
      { error: "Name must contain letters or numbers" },
      { status: 400 },
    );
  }

  try {
    const record = await create({ input, slug, userId });
    return Response.json(record, { status: 201 });
  } catch (error) {
    const mapped = domainErrorResponse(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function updateResponse<T>(
  request: Request,
  isValidInput: InputGuard,
  update: (context: CreateContext) => Promise<T | null>,
): Promise<Response> {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const body = await parseBody(request);
  if (body === INVALID || !isValidInput(body)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const record = await update({
      input: body as Record<string, unknown>,
      userId,
    });
    if (!record) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json(record);
  } catch (error) {
    const mapped = domainErrorResponse(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function deleteResponse(
  remove: (userId: string) => Promise<boolean>,
): Promise<Response> {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const deleted = await remove(userId);
    return Response.json({ deleted }, { status: deleted ? 200 : 404 });
  } catch (error) {
    const mapped = domainErrorResponse(error);
    if (mapped) return mapped;
    throw error;
  }
}
