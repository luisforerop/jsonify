import {
  createRecord,
  listCollection,
  removeRecord,
  updateRecord,
  type CollectionName,
} from "@/lib/server/json-store";

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
): Promise<Response> {
  return Response.json(await listCollection(collection));
}

export async function createResponse(
  collection: CollectionName,
  request: Request,
  isValidInput: InputGuard,
): Promise<Response> {
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

export async function updateResponse(
  collection: CollectionName,
  id: string,
  request: Request,
  isValidInput: InputGuard,
): Promise<Response> {
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
  const deleted = await removeRecord(collection, id);
  return Response.json({ deleted }, { status: deleted ? 200 : 404 });
}
