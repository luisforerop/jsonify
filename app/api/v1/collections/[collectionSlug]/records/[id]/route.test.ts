import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { generateApiKey } from "@/lib/server/api-keys";
import { createRecord, type StoredRecord } from "@/lib/server/json-store";

import { DELETE, GET, PUT } from "./route";

let dataDir = "";
let workspace: StoredRecord;
let collection: StoredRecord;
let schema: StoredRecord;
let record: StoredRecord;
let apiKey: string;

const schemaDoc = {
  type: "object",
  properties: { nombre: { type: "string" }, porciones: { type: "integer" } },
  required: ["nombre"],
};

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "jsonify-v1-record-"));
  process.env.JSONIFY_DATA_DIR = dataDir;
  workspace = await createRecord("workspaces", {
    name: "Cocina",
    slug: "cocina",
    ownerId: "u1",
  });
  collection = await createRecord("collections", {
    name: "Recetas",
    slug: "recetas",
    workspaceId: workspace.id,
    isPublic: true,
  });
  schema = await createRecord("schemas", {
    name: "Receta",
    collectionId: collection.id,
    workspaceId: workspace.id,
    schema: schemaDoc,
  });
  record = await createRecord("records", {
    name: "Arepa",
    collectionId: collection.id,
    schemaId: schema.id,
    schemaName: "Receta",
    values: { nombre: "Arepa", porciones: 2 },
  });
  const generated = generateApiKey();
  apiKey = generated.key;
  await createRecord("apiKeys", {
    name: "Test key",
    workspaceId: workspace.id,
    keyHash: generated.keyHash,
    keyPrefix: generated.keyPrefix,
    scopes: ["*"],
    lastUsedAt: null,
  });
});

afterEach(async () => {
  delete process.env.JSONIFY_DATA_DIR;
  await rm(dataDir, { recursive: true, force: true });
});

function ctx(id: string) {
  return { params: Promise.resolve({ collectionSlug: "recetas", id }) };
}

function req(init: RequestInit = {}): Request {
  return new Request("http://localhost/api/v1/collections/recetas/records/x", {
    ...init,
    headers: {
      "x-workspace-id": workspace.id,
      "x-schema": "Receta",
      authorization: `Bearer ${apiKey}`,
      ...(init.headers ?? {}),
    },
  });
}

describe("v1 single-record route", () => {
  it("GET returns the record wrapped in { data }", async () => {
    const response = await GET(req(), ctx(record.id));
    expect(response.status).toBe(200);
    expect((await response.json()).data.content).toEqual({
      nombre: "Arepa",
      porciones: 2,
    });
  });

  it("PUT replaces the record's values", async () => {
    const response = await PUT(
      req({ method: "PUT", body: JSON.stringify({ nombre: "Bollo", porciones: 6 }) }),
      ctx(record.id),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.content).toEqual({ nombre: "Bollo", porciones: 6 });
    expect(body.data.schemaVersion).toBe("Receta");
    expect(body.data.updatedAt >= body.data.createdAt).toBe(true);
  });

  it("PUT without x-schema is rejected with 400", async () => {
    const request = new Request("http://localhost/x", {
      method: "PUT",
      body: JSON.stringify({ nombre: "Bollo" }),
      headers: {
        "x-workspace-id": workspace.id,
        authorization: `Bearer ${apiKey}`,
      },
    });
    const response = await PUT(request, ctx(record.id));
    expect(response.status).toBe(400);
  });

  it("PUT with an invalid body leaves the record unchanged", async () => {
    const response = await PUT(
      req({ method: "PUT", body: JSON.stringify({ porciones: 6 }) }),
      ctx(record.id),
    );
    expect(response.status).toBe(400);
    const after = await (await GET(req(), ctx(record.id))).json();
    expect(after.data.content).toEqual({ nombre: "Arepa", porciones: 2 });
  });

  it("DELETE removes the record", async () => {
    const removed = await DELETE(req({ method: "DELETE" }), ctx(record.id));
    expect(removed.status).toBe(200);
    expect(await removed.json()).toEqual({ success: true });

    const missing = await GET(req(), ctx(record.id));
    expect(missing.status).toBe(404);
  });

  it("returns 404 for a record id that belongs to another collection", async () => {
    const otherCollection = await createRecord("collections", {
      name: "Postres",
      slug: "postres",
      workspaceId: workspace.id,
    });
    const otherRecord = await createRecord("records", {
      name: "Flan",
      collectionId: otherCollection.id,
      schemaId: schema.id,
      schemaName: "Receta",
      values: { nombre: "Flan" },
    });

    const response = await GET(req(), ctx(otherRecord.id));
    expect(response.status).toBe(404);
  });

  it("GET without a key is 401 for a private collection", async () => {
    const privateCollection = await createRecord("collections", {
      name: "Privado",
      slug: "privado",
      workspaceId: workspace.id,
      isPublic: false,
    });
    const privateRecord = await createRecord("records", {
      name: "Secreto",
      collectionId: privateCollection.id,
      schemaId: schema.id,
      schemaName: "Receta",
      values: { nombre: "Secreto" },
    });
    const request = new Request("http://localhost/api/v1/collections/privado/records/x", {
      headers: { "x-workspace-id": workspace.id },
    });
    const response = await GET(request, {
      params: Promise.resolve({ collectionSlug: "privado", id: privateRecord.id }),
    });
    expect(response.status).toBe(401);
  });

  it("DELETE with a key that lacks the delete scope is 403", async () => {
    const generated = generateApiKey();
    await createRecord("apiKeys", {
      name: "Read only",
      workspaceId: workspace.id,
      keyHash: generated.keyHash,
      keyPrefix: generated.keyPrefix,
      scopes: ["read:recetas"],
      lastUsedAt: null,
    });
    const response = await DELETE(
      req({
        method: "DELETE",
        headers: { authorization: `Bearer ${generated.key}` },
      }),
      ctx(record.id),
    );
    expect(response.status).toBe(403);
  });
});
