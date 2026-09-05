import {
  createRecord,
  listCollection,
  removeRecord,
  updateRecord,
  type CollectionName,
} from "@/lib/server/json-store";
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

export async function listResponse(
  collection: CollectionName,
  options: { ownerField?: string } = {},
): Promise<Response> {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const records = await listCollection(collection);
  const scoped = options.ownerField
    ? records.filter((record) => record[options.ownerField!] === userId)
    : records;
  return Response.json(scoped);
}

export async function createResponse(
  collection: CollectionName,
  request: Request,
  isValidInput: InputGuard,
): Promise<Response> {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const body = await parseBody(request);
  if (body === INVALID || !isValidInput(body)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const record = await createRecord(
    collection,
    body as Record<string, unknown>,
  );
  return Response.json(record, { status: 201 });
}

/**
 * Create a record that carries a generated `slug`, rejecting a name whose slug
 * collides with an existing sibling. Siblings are the records in the collection
 * that share the same value for `scopeField` (e.g. workspaces owned by the same
 * user, or collections in the same workspace).
 *
 * When `options.ownerField` is set, that field is forced to the authenticated
 * user's id regardless of what the request body carries.
 */
export async function createSluggedResponse(
  collection: CollectionName,
  request: Request,
  isValidInput: InputGuard,
  scopeField: string,
  options: { ownerField?: string } = {},
): Promise<Response> {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const body = await parseBody(request);
  if (body === INVALID) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  const input = options.ownerField
    ? { ...(body as Record<string, unknown>), [options.ownerField]: userId }
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

  const scopeValue = input[scopeField];
  const siblings = (await listCollection(collection)).filter(
    (record) => record[scopeField] === scopeValue,
  );
  if (siblings.some((record) => record.slug === slug)) {
    return Response.json(
      { error: "That name is already taken here" },
      { status: 400 },
    );
  }

  const record = await createRecord(collection, { ...input, slug });
  return Response.json(record, { status: 201 });
}

export async function updateResponse(
  collection: CollectionName,
  id: string,
  request: Request,
  isValidInput: InputGuard,
): Promise<Response> {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const body = await parseBody(request);
  if (body === INVALID || !isValidInput(body)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const record = await updateRecord(
    collection,
    id,
    body as Record<string, unknown>,
  );
  if (!record) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json(record);
}

export async function deleteResponse(
  collection: CollectionName,
  id: string,
): Promise<Response> {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const deleted = await removeRecord(collection, id);
  return Response.json({ deleted }, { status: deleted ? 200 : 404 });
}
