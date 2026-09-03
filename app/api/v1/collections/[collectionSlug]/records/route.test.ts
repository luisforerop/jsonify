import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createRecord, type StoredRecord } from "@/lib/server/json-store";

import { GET, POST } from "./route";

let dataDir = "";
let workspace: StoredRecord;
let collection: StoredRecord;
let schema: StoredRecord;

const schemaDoc = {
  type: "object",
  properties: {
    nombre: { type: "string" },
    porciones: { type: "integer" },
  },
  required: ["nombre"],
};

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "jsonify-v1-records-"));
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
  });
  schema = await createRecord("schemas", {
    name: "Receta",
    collectionId: collection.id,
    workspaceId: workspace.id,
    schema: schemaDoc,
  });
});

afterEach(async () => {
  delete process.env.JSONIFY_DATA_DIR;
  await rm(dataDir, { recursive: true, force: true });
});

const ctx = { params: Promise.resolve({ collectionSlug: "recetas" }) };

function req(init: RequestInit & { query?: string } = {}): Request {
  const { query, ...rest } = init;
  return new Request(
    `http://localhost/api/v1/collections/recetas/records${query ?? ""}`,
    {
      ...rest,
      headers: {
        "x-workspace-id": workspace.id,
        "x-schema": "Receta",
        ...(rest.headers ?? {}),
      },
    },
  );
}

describe("v1 records collection route", () => {
  it("POST creates a record and GET then lists it", async () => {
    const created = await POST(
      req({ method: "POST", body: JSON.stringify({ nombre: "Arepa", porciones: 4 }) }),
      ctx,
    );
    expect(created.status).toBe(201);
    const createdBody = await created.json();
    expect(createdBody.id).toEqual(createdBody.data.id);
    expect(createdBody.data.content).toEqual({ nombre: "Arepa", porciones: 4 });
    expect(createdBody.data.schemaVersion).toBe("Receta");

    const listed = await GET(req(), ctx);
    expect(listed.status).toBe(200);
    const listedBody = await listed.json();
    expect(listedBody.pagination).toEqual({ total: 1, page: 1, limit: 20 });
    expect(listedBody.items).toHaveLength(1);
    expect(listedBody.items[0].content).toEqual({ nombre: "Arepa", porciones: 4 });
  });

  it("POST rejects a payload that violates the schema with 400", async () => {
    const response = await POST(
      req({ method: "POST", body: JSON.stringify({ porciones: 4 }) }),
      ctx,
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(Array.isArray(body.details)).toBe(true);

    const listed = await (await GET(req(), ctx)).json();
    expect(listed.pagination.total).toBe(0);
  });

  it("POST rejects a non-object body with 400", async () => {
    const response = await POST(
      req({ method: "POST", body: JSON.stringify([1, 2, 3]) }),
      ctx,
    );
    expect(response.status).toBe(400);
  });

  it("GET paginates with page and limit and reports the full total", async () => {
    for (let i = 0; i < 25; i += 1) {
      await createRecord("records", {
        name: `Receta ${i}`,
        collectionId: collection.id,
        schemaId: schema.id,
        schemaName: "Receta",
        values: { nombre: `Receta ${i}` },
      });
    }

    const page2 = await (
      await GET(req({ query: "?page=2&limit=20" }), ctx)
    ).json();
    expect(page2.pagination).toEqual({ total: 25, page: 2, limit: 20 });
    expect(page2.items).toHaveLength(5);

    const pastEnd = await (await GET(req({ query: "?page=99" }), ctx)).json();
    expect(pastEnd.pagination.total).toBe(25);
    expect(pastEnd.items).toEqual([]);
  });

  it("GET returns an empty page for a collection with no records", async () => {
    const body = await (await GET(req(), ctx)).json();
    expect(body).toEqual({ items: [], pagination: { total: 0, page: 1, limit: 20 } });
  });
});
