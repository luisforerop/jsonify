import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DELETE, PATCH } from "./[id]/route";
import { GET, POST } from "./route";

let dataDir = "";

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "jsonify-routes-"));
  process.env.JSONIFY_DATA_DIR = dataDir;
});

afterEach(async () => {
  delete process.env.JSONIFY_DATA_DIR;
  await rm(dataDir, { recursive: true, force: true });
});

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/projects", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function itemContext(id: string) {
  return { params: Promise.resolve({ id }) } as Parameters<typeof DELETE>[1];
}

describe("projects route handlers", () => {
  it("GET returns an empty list before anything is created", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("POST creates a project and GET then lists it", async () => {
    const created = await POST(postRequest({ name: "Onboarding" }));
    expect(created.status).toBe(201);
    const record = await created.json();
    expect(record).toMatchObject({ name: "Onboarding" });
    expect(record.id).toEqual(expect.any(String));

    const listed = await (await GET()).json();
    expect(listed).toHaveLength(1);
  });

  it("POST rejects an invalid payload with 400", async () => {
    const response = await POST(postRequest({ name: "   " }));
    expect(response.status).toBe(400);
    expect(await (await GET()).json()).toEqual([]);
  });

  it("PATCH updates an existing project", async () => {
    const record = await (await POST(postRequest({ name: "Old" }))).json();
    const response = await PATCH(
      postRequest({ name: "New" }),
      itemContext(record.id),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: record.id, name: "New" });
  });

  it("PATCH returns 404 for an unknown id", async () => {
    const response = await PATCH(
      postRequest({ name: "New" }),
      itemContext("missing"),
    );
    expect(response.status).toBe(404);
  });

  it("DELETE removes a project and reports the outcome", async () => {
    const record = await (await POST(postRequest({ name: "Temp" }))).json();

    const removed = await DELETE(postRequest({}), itemContext(record.id));
    expect(removed.status).toBe(200);
    expect(await removed.json()).toEqual({ deleted: true });

    const missing = await DELETE(postRequest({}), itemContext(record.id));
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ deleted: false });
  });
});
