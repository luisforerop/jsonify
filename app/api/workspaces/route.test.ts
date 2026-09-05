import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(async () => ({
    fullName: "Test User",
    username: "testuser",
    primaryEmailAddress: { emailAddress: "test@example.com" },
  })),
}));

import { auth } from "@clerk/nextjs/server";

import { GET, POST } from "./route";

let dataDir = "";

function signInAs(userId: string | null): void {
  vi.mocked(auth).mockResolvedValue({ userId } as never);
}

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "jsonify-routes-"));
  process.env.JSONIFY_DATA_DIR = dataDir;
  signInAs("test-user");
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
  it("POST creates a workspace owned by the authenticated user", async () => {
    const created = await POST(postRequest({ name: "Clean Fuel" }));
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({
      name: "Clean Fuel",
      ownerId: "test-user",
      slug: "clean-fuel",
    });
  });

  it("POST rejects a duplicate slug for the same owner", async () => {
    await POST(postRequest({ name: "Clean Fuel" }));
    const conflict = await POST(postRequest({ name: "clean fuel" }));
    expect(conflict.status).toBe(400);
    expect(await (await GET()).json()).toHaveLength(1);
  });

  it("POST allows the same slug for a different owner", async () => {
    await POST(postRequest({ name: "Clean Fuel" }));
    signInAs("other-user");
    const other = await POST(postRequest({ name: "Clean Fuel" }));
    expect(other.status).toBe(201);
  });

  it("GET only lists the authenticated user's own workspaces", async () => {
    await POST(postRequest({ name: "Mine" }));
    signInAs("other-user");
    await POST(postRequest({ name: "Theirs" }));

    signInAs("test-user");
    const listed = await (await GET()).json();
    expect(listed).toHaveLength(1);
    expect(listed[0].name).toBe("Mine");
  });

  it("rejects requests with no signed-in user", async () => {
    signInAs(null);
    const response = await POST(postRequest({ name: "Clean Fuel" }));
    expect(response.status).toBe(401);
  });
});
