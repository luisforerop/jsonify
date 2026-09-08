import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { JsonSchema } from "@/lib/schema-builder";
import { generateApiKey } from "@/lib/server/api-keys";
import { resetRepositories, setRepositories } from "@/lib/server/repositories";
import type {
  Collection,
  RecordRow,
  SchemaRow,
  Workspace,
} from "@/lib/server/repositories";
import { makeFakeRepositories } from "@/lib/server/repositories/testing";

import { DELETE, GET, PUT } from "./route";

let repos: ReturnType<typeof makeFakeRepositories>;
let workspace: Workspace;
let collection: Collection;
let schema: SchemaRow;
let record: RecordRow;
let apiKey: string;

const schemaDoc: JsonSchema = {
  type: "object",
  properties: { nombre: { type: "string" }, porciones: { type: "integer" } },
  required: ["nombre"],
};

beforeEach(async () => {
  repos = makeFakeRepositories();
  setRepositories(repos);
  workspace = await repos.workspaces.create({
    name: "Cocina",
    slug: "cocina",
    ownerId: "u1",
  });
  collection = await repos.collections.create({
    name: "Recetas",
    slug: "recetas",
    workspaceId: workspace.id,
    isPublic: true,
  });
  schema = await repos.schemas.create({
    name: "Receta",
    collectionId: collection.id,
    schemaDefinition: schemaDoc,
  });
  record = await repos.records.create({
    workspaceId: workspace.id,
    collectionId: collection.id,
    schemaId: schema.id,
    payload: { nombre: "Arepa", porciones: 2 },
  });
  const generated = generateApiKey();
  apiKey = generated.key;
  await repos.apiKeys.create({
    name: "Test key",
    workspaceId: workspace.id,
    keyHash: generated.keyHash,
    keyPrefix: generated.keyPrefix,
    scopes: ["*"],
  });
});

afterEach(() => {
  resetRepositories();
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
    const otherCollection = await repos.collections.create({
      name: "Postres",
      slug: "postres",
      workspaceId: workspace.id,
    });
    const otherRecord = await repos.records.create({
      workspaceId: workspace.id,
      collectionId: otherCollection.id,
      schemaId: schema.id,
      payload: { nombre: "Flan" },
    });

    const response = await GET(req(), ctx(otherRecord.id));
    expect(response.status).toBe(404);
  });

  it("GET without a key is 401 for a private collection", async () => {
    const privateCollection = await repos.collections.create({
      name: "Privado",
      slug: "privado",
      workspaceId: workspace.id,
      isPublic: false,
    });
    const privateRecord = await repos.records.create({
      workspaceId: workspace.id,
      collectionId: privateCollection.id,
      schemaId: schema.id,
      payload: { nombre: "Secreto" },
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
    await repos.apiKeys.create({
      name: "Read only",
      workspaceId: workspace.id,
      keyHash: generated.keyHash,
      keyPrefix: generated.keyPrefix,
      scopes: ["read:recetas"],
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
