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

import { resetRepositories, setRepositories } from "@/lib/server/repositories";
import { makeFakeRepositories } from "@/lib/server/repositories/testing";
import type { Workspace } from "@/lib/server/repositories";

import { DELETE } from "./[id]/route";
import { GET, POST } from "./route";

let repos: ReturnType<typeof makeFakeRepositories>;
let workspace: Workspace;

beforeEach(async () => {
  repos = makeFakeRepositories();
  setRepositories(repos);
  vi.mocked(auth).mockResolvedValue({ userId: "test-user" } as never);
  workspace = await repos.workspaces.create({
    name: "Cocina",
    slug: "cocina",
    ownerId: "u1",
  });
});

afterEach(() => {
  resetRepositories();
  vi.restoreAllMocks();
});

function listRequest(workspaceId?: string): Request {
  const url = workspaceId
    ? `http://localhost/api/api-keys?workspaceId=${workspaceId}`
    : "http://localhost/api/api-keys";
  return new Request(url);
}

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/api-keys", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function itemContext(id: string) {
  return { params: Promise.resolve({ id }) } as Parameters<typeof DELETE>[1];
}

describe("api-keys route handlers", () => {
  it("GET requires a workspaceId query param", async () => {
    const response = await GET(listRequest());
    expect(response.status).toBe(400);
  });

  it("POST creates a key, returns the raw secret once, and GET never includes the hash", async () => {
    const created = await POST(
      postRequest({
        name: "Integration",
        workspaceId: workspace.id,
        scopes: ["read:*"],
      }),
    );
    expect(created.status).toBe(201);
    const createdBody = await created.json();
    expect(createdBody.key).toMatch(/^jfy_[0-9a-f]{32}$/);
    expect(createdBody.keyPrefix).toBe(createdBody.key.slice(0, 12));
    expect(createdBody.keyHash).toBeUndefined();

    const listed = await (await GET(listRequest(workspace.id))).json();
    expect(listed).toHaveLength(1);
    expect(listed[0].keyHash).toBeUndefined();
    expect(listed[0].key).toBeUndefined();
    expect(listed[0].keyPrefix).toBe(createdBody.keyPrefix);
  });

  it("POST rejects an invalid scope with 400", async () => {
    const response = await POST(
      postRequest({
        name: "Bad",
        workspaceId: workspace.id,
        scopes: ["admin:recetas"],
      }),
    );
    expect(response.status).toBe(400);
    expect(await (await GET(listRequest(workspace.id))).json()).toEqual([]);
  });

  it("POST rejects a missing name with 400", async () => {
    const response = await POST(
      postRequest({ workspaceId: workspace.id, scopes: ["*"] }),
    );
    expect(response.status).toBe(400);
  });

  it("POST rejects an unknown workspace with 400", async () => {
    const response = await POST(
      postRequest({ name: "A", workspaceId: "missing", scopes: ["*"] }),
    );
    expect(response.status).toBe(400);
  });

  it("keeps keys isolated between workspaces", async () => {
    const other = await repos.workspaces.create({
      name: "Postres",
      slug: "postres",
      ownerId: "u1",
    });
    await POST(
      postRequest({ name: "A", workspaceId: workspace.id, scopes: ["*"] }),
    );
    await POST(postRequest({ name: "B", workspaceId: other.id, scopes: ["*"] }));

    const listed = await (await GET(listRequest(workspace.id))).json();
    expect(listed).toHaveLength(1);
    expect(listed[0].name).toBe("A");
  });

  it("DELETE removes an existing key and 404s for an unknown id", async () => {
    const created = await (
      await POST(
        postRequest({ name: "Temp", workspaceId: workspace.id, scopes: ["*"] }),
      )
    ).json();

    const removed = await DELETE(postRequest({}), itemContext(created.id));
    expect(removed.status).toBe(200);
    expect(await removed.json()).toEqual({ deleted: true });

    const missing = await DELETE(postRequest({}), itemContext(created.id));
    expect(missing.status).toBe(404);
  });

  it("rejects requests with no signed-in user", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const response = await POST(
      postRequest({ name: "A", workspaceId: workspace.id, scopes: ["*"] }),
    );
    expect(response.status).toBe(401);
  });
});
