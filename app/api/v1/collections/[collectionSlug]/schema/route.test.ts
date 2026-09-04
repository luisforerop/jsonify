import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { generateApiKey } from "@/lib/server/api-keys";
import { createRecord, type StoredRecord } from "@/lib/server/json-store";

import {
  GET as recordsGET,
  OPTIONS as recordsOPTIONS,
  POST as recordsPOST,
} from "../records/route";
import { GET, OPTIONS } from "./route";

let dataDir = "";
let workspace: StoredRecord;
let collection: StoredRecord;
let apiKey: string;

const schemaDoc = {
  type: "object",
  properties: { nombre: { type: "string" } },
  required: ["nombre"],
};

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "jsonify-v1-schema-"));
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

const ctx = { params: Promise.resolve({ collectionSlug: "recetas" }) };

function req(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/v1/collections/recetas/schema", {
    headers,
  });
}

async function addSchema(name: string) {
  return createRecord("schemas", {
    name,
    collectionId: collection.id,
    workspaceId: workspace.id,
    schema: schemaDoc,
  });
}

describe("v1 schema route", () => {
  it("returns the collection's only schema without an x-schema header", async () => {
    await addSchema("Receta");
    const response = await GET(req({ "x-workspace-id": workspace.id }), ctx);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ schema: schemaDoc });
  });

  it("400s when the collection has multiple schemas and no x-schema header", async () => {
    await addSchema("Receta");
    await addSchema("RecetaV2");
    const response = await GET(req({ "x-workspace-id": workspace.id }), ctx);
    expect(response.status).toBe(400);
  });

  it("409s when the collection has no schema", async () => {
    const response = await GET(req({ "x-workspace-id": workspace.id }), ctx);
    expect(response.status).toBe(409);
  });
});

describe("v1 public API request resolution", () => {
  it("400s when x-workspace-id is missing", async () => {
    const response = await recordsGET(req({}), ctx);
    expect(response.status).toBe(400);
  });

  it("404s for an unknown workspace id", async () => {
    const response = await recordsGET(req({ "x-workspace-id": "nope" }), ctx);
    expect(response.status).toBe(404);
  });

  it("404s for a collection slug not in the workspace", async () => {
    const response = await recordsGET(req({ "x-workspace-id": workspace.id }), {
      params: Promise.resolve({ collectionSlug: "postres" }),
    });
    expect(response.status).toBe(404);
  });

  it("400s on POST without an x-schema header", async () => {
    await addSchema("Receta");
    const response = await recordsPOST(
      new Request("http://localhost/x", {
        method: "POST",
        body: JSON.stringify({ nombre: "Arepa" }),
        headers: {
          "x-workspace-id": workspace.id,
          authorization: `Bearer ${apiKey}`,
        },
      }),
      ctx,
    );
    expect(response.status).toBe(400);
  });

  it("409s on POST when the collection has no schema", async () => {
    const response = await recordsPOST(
      new Request("http://localhost/x", {
        method: "POST",
        body: JSON.stringify({ nombre: "Arepa" }),
        headers: {
          "x-workspace-id": workspace.id,
          "x-schema": "Receta",
          authorization: `Bearer ${apiKey}`,
        },
      }),
      ctx,
    );
    expect(response.status).toBe(409);
  });

  it("401s on POST without a key, even on a public collection", async () => {
    const response = await recordsPOST(
      new Request("http://localhost/x", {
        method: "POST",
        body: JSON.stringify({ nombre: "Arepa" }),
        headers: { "x-workspace-id": workspace.id, "x-schema": "Receta" },
      }),
      ctx,
    );
    expect(response.status).toBe(401);
  });

  it("answers an OPTIONS preflight with CORS headers", async () => {
    const response = recordsOPTIONS();
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("PUT");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "Authorization",
    );
  });

  it("includes CORS headers on a normal response", async () => {
    await addSchema("Receta");
    const response = await GET(req({ "x-workspace-id": workspace.id }), ctx);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
