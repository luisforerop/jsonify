import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

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
  return new Request("http://localhost/api/workspaces", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("workspaces route handlers", () => {
  it("POST creates a workspace with a generated slug", async () => {
    const created = await POST(
      postRequest({ name: "Clean Fuel", ownerId: "u1" }),
    );
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({
      name: "Clean Fuel",
      ownerId: "u1",
      slug: "clean-fuel",
    });
  });

  it("POST rejects a duplicate slug for the same owner", async () => {
    await POST(postRequest({ name: "Clean Fuel", ownerId: "u1" }));
    const conflict = await POST(
      postRequest({ name: "clean fuel", ownerId: "u1" }),
    );
    expect(conflict.status).toBe(400);
    expect(await (await GET()).json()).toHaveLength(1);
  });

  it("POST allows the same slug for a different owner", async () => {
    await POST(postRequest({ name: "Clean Fuel", ownerId: "u1" }));
    const other = await POST(
      postRequest({ name: "Clean Fuel", ownerId: "u2" }),
    );
    expect(other.status).toBe(201);
    expect(await (await GET()).json()).toHaveLength(2);
  });

  it("POST rejects a payload without an owner", async () => {
    const response = await POST(postRequest({ name: "Clean Fuel" }));
    expect(response.status).toBe(400);
  });
});
