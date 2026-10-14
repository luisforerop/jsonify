import { beforeEach, describe, expect, it } from "vitest";

import {
  repositories,
  setRepositories,
} from "@/lib/server/repositories";
import { makeFakeRepositories } from "@/lib/server/repositories/testing";

import { DELETE, GET, POST } from "./route";

let schemaId: string;
let collectionId: string;

const definition = {
  type: "object",
  properties: { name: { type: "string" } },
  required: ["name"],
} as never;

beforeEach(async () => {
  setRepositories(makeFakeRepositories());
  const workspace = await repositories.workspaces.create({
    name: "WS",
    slug: "ws",
    ownerId: "owner",
  });
  const collection = await repositories.collections.create({
    workspaceId: workspace.id,
    name: "Col",
    slug: "col",
  });
  collectionId = collection.id;
  schemaId = (
    await repositories.schemas.create({
      collectionId,
      name: "Form",
      schemaDefinition: definition,
    })
  ).id;
});

const ctx = (id: string) => ({ params: Promise.resolve({ schemaId: id }) }) as never;
const post = (id: string, body: string) =>
  POST(new Request("http://x", { method: "POST", body }), ctx(id));

describe("GET", () => {
  it("reports closed when sharing is off", async () => {
    const response = await GET(new Request("http://x"), ctx(schemaId));
    expect(await response.json()).toEqual({ accepting: false });
  });

  it("returns the schema when sharing is on", async () => {
    await repositories.schemas.update(schemaId, { sharingEnabled: true });
    const body = await (await GET(new Request("http://x"), ctx(schemaId))).json();
    expect(body).toMatchObject({ accepting: true, name: "Form" });
  });

  it("404s on unknown or malformed ids", async () => {
    expect((await GET(new Request("http://x"), ctx("nope"))).status).toBe(404);
    expect(
      (await GET(new Request("http://x"), ctx("00000000-0000-4000-8000-000000000000"))).status,
    ).toBe(404);
  });
});

describe("POST", () => {
  it("rejects while sharing is off", async () => {
    const response = await post(schemaId, JSON.stringify({ name: "a" }));
    expect(response.status).toBe(403);
    expect(await repositories.records.list()).toHaveLength(0);
  });

  it("creates a record when on and valid", async () => {
    await repositories.schemas.update(schemaId, { sharingEnabled: true });
    const response = await post(schemaId, JSON.stringify({ name: "a" }));
    expect(response.status).toBe(201);
    const records = await repositories.records.list();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ collectionId, schemaId, payload: { name: "a" } });
  });

  it("rejects invalid payloads", async () => {
    await repositories.schemas.update(schemaId, { sharingEnabled: true });
    expect((await post(schemaId, JSON.stringify({ name: 1 }))).status).toBe(400);
    expect((await post(schemaId, "[]")).status).toBe(400);
    expect((await post(schemaId, "not json")).status).toBe(400);
    expect(await repositories.records.list()).toHaveLength(0);
  });

  it("rejects oversized bodies", async () => {
    await repositories.schemas.update(schemaId, { sharingEnabled: true });
    const big = JSON.stringify({ name: "x".repeat(200 * 1024) });
    expect((await post(schemaId, big)).status).toBe(413);
  });

  it("rejects after being toggled off", async () => {
    await repositories.schemas.update(schemaId, { sharingEnabled: true });
    await repositories.schemas.update(schemaId, { sharingEnabled: false });
    expect((await post(schemaId, JSON.stringify({ name: "a" }))).status).toBe(403);
  });

  it("404s for an unknown schema", async () => {
    const response = await post("00000000-0000-4000-8000-000000000000", "{}");
    expect(response.status).toBe(404);
  });
});

describe("other methods", () => {
  it("returns 405", async () => {
    const response = await DELETE();
    expect(response.status).toBe(405);
  });
});
