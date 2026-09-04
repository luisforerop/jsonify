import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { hashApiKey } from "@/lib/server/api-keys";
import { createRecord, type StoredRecord } from "@/lib/server/json-store";
import { resolvePublicContext } from "@/lib/server/public-api-context";

let dataDir = "";
let workspace: StoredRecord;
let collection: StoredRecord;

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "jsonify-ctx-"));
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
});

afterEach(async () => {
  delete process.env.JSONIFY_DATA_DIR;
  await rm(dataDir, { recursive: true, force: true });
});

function request(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/v1/collections/recetas/records", {
    headers,
  });
}

async function addSchema(name: string) {
  return createRecord("schemas", {
    name,
    collectionId: collection.id,
    workspaceId: workspace.id,
    schema: { type: "object", properties: { nombre: { type: "string" } } },
  });
}

describe("resolvePublicContext", () => {
  it("400s when the workspace header is missing", async () => {
    const result = await resolvePublicContext(request({}), "recetas", {
      schema: "none",
      action: "read",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });

  it("404s for an unknown workspace id", async () => {
    const result = await resolvePublicContext(
      request({ "x-workspace-id": "nope" }),
      "recetas",
      { schema: "none", action: "read" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(404);
  });

  it("404s for a collection slug not in the workspace", async () => {
    const result = await resolvePublicContext(
      request({ "x-workspace-id": workspace.id }),
      "postres",
      { schema: "none", action: "read" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(404);
  });

  it("resolves workspace and collection with schema mode none", async () => {
    const result = await resolvePublicContext(
      request({ "x-workspace-id": workspace.id }),
      "recetas",
      { schema: "none", action: "read" },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.collection.id).toBe(collection.id);
      expect(result.schema).toBeNull();
    }
  });

  it("409s when the collection has no schema", async () => {
    const result = await resolvePublicContext(
      request({ "x-workspace-id": workspace.id }),
      "recetas",
      { schema: "required", action: "read" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(409);
  });

  it("selects a schema by name", async () => {
    await addSchema("Receta");
    const result = await resolvePublicContext(
      request({ "x-workspace-id": workspace.id, "x-schema": "Receta" }),
      "recetas",
      { schema: "required", action: "read" },
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.schema?.name).toBe("Receta");
  });

  it("selects a schema by id when no name matches", async () => {
    const created = await addSchema("Receta");
    const result = await resolvePublicContext(
      request({ "x-workspace-id": workspace.id, "x-schema": created.id }),
      "recetas",
      { schema: "required", action: "read" },
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.schema?.id).toBe(created.id);
  });

  it("404s for an unknown x-schema value", async () => {
    await addSchema("Receta");
    const result = await resolvePublicContext(
      request({ "x-workspace-id": workspace.id, "x-schema": "Otro" }),
      "recetas",
      { schema: "required", action: "read" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(404);
  });

  it("400s when x-schema is required but absent", async () => {
    await addSchema("Receta");
    const result = await resolvePublicContext(
      request({ "x-workspace-id": workspace.id }),
      "recetas",
      { schema: "required", action: "read" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });

  it("uses the sole schema when mode is optional and no header is sent", async () => {
    await addSchema("Receta");
    const result = await resolvePublicContext(
      request({ "x-workspace-id": workspace.id }),
      "recetas",
      { schema: "optional", action: "read" },
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.schema?.name).toBe("Receta");
  });

  it("400s when mode is optional, no header, and multiple schemas exist", async () => {
    await addSchema("Receta");
    await addSchema("RecetaV2");
    const result = await resolvePublicContext(
      request({ "x-workspace-id": workspace.id }),
      "recetas",
      { schema: "optional", action: "read" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });
});

describe("resolvePublicContext authorization", () => {
  beforeEach(async () => {
    await createRecord("collections", {
      name: "Privado",
      slug: "privado",
      workspaceId: workspace.id,
      isPublic: false,
    });
  });

  async function addApiKey(scopes: string[], forWorkspace = workspace) {
    const raw = `jfy_${Math.random().toString(16).slice(2).padEnd(32, "0")}`;
    await createRecord("apiKeys", {
      name: "Test key",
      workspaceId: forWorkspace.id,
      keyHash: hashApiKey(raw),
      keyPrefix: raw.slice(0, 12),
      scopes,
      lastUsedAt: null,
    });
    return raw;
  }

  it("allows a public-collection read with no key", async () => {
    const result = await resolvePublicContext(
      request({ "x-workspace-id": workspace.id }),
      "recetas",
      { schema: "none", action: "read" },
    );
    expect(result.ok).toBe(true);
  });

  it("401s a private-collection read with no key", async () => {
    const result = await resolvePublicContext(
      request({ "x-workspace-id": workspace.id }),
      "privado",
      { schema: "none", action: "read" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("401s any write with no key, even on a public collection", async () => {
    const result = await resolvePublicContext(
      request({ "x-workspace-id": workspace.id }),
      "recetas",
      { schema: "none", action: "write" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("succeeds with a key carrying a matching scope", async () => {
    const raw = await addApiKey(["write:privado"]);
    const result = await resolvePublicContext(
      request({
        "x-workspace-id": workspace.id,
        authorization: `Bearer ${raw}`,
      }),
      "privado",
      { schema: "none", action: "write" },
    );
    expect(result.ok).toBe(true);
  });

  it("403s a key with an insufficient scope", async () => {
    const raw = await addApiKey(["read:privado"]);
    const result = await resolvePublicContext(
      request({
        "x-workspace-id": workspace.id,
        authorization: `Bearer ${raw}`,
      }),
      "privado",
      { schema: "none", action: "delete" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("401s a key that belongs to a different workspace", async () => {
    const otherWorkspace = await createRecord("workspaces", {
      name: "Otro",
      slug: "otro",
      ownerId: "u2",
    });
    const raw = await addApiKey(["*"], otherWorkspace);
    const result = await resolvePublicContext(
      request({
        "x-workspace-id": workspace.id,
        authorization: `Bearer ${raw}`,
      }),
      "privado",
      { schema: "none", action: "read" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("returns the authorization failure before the schema's 409", async () => {
    const result = await resolvePublicContext(
      request({ "x-workspace-id": workspace.id }),
      "privado",
      { schema: "required", action: "write" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });
});
