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

import { DELETE, PATCH } from "./[id]/route";
import { GET, POST } from "./route";

beforeEach(() => {
  setRepositories(makeFakeRepositories());
  vi.mocked(auth).mockResolvedValue({ userId: "test-user" } as never);
});

afterEach(() => {
  resetRepositories();
  vi.restoreAllMocks();
});

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/collections", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function itemContext(id: string) {
  return { params: Promise.resolve({ id }) } as Parameters<typeof DELETE>[1];
}

describe("collections route handlers", () => {
  it("GET returns an empty list before anything is created", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("POST creates a collection with a generated slug and GET then lists it", async () => {
    const created = await POST(
      postRequest({ name: "Recetas", workspaceId: "w1" }),
    );
    expect(created.status).toBe(201);
    const record = await created.json();
    expect(record).toMatchObject({
      name: "Recetas",
      workspaceId: "w1",
      slug: "recetas",
    });

    const listed = await (await GET()).json();
    expect(listed).toHaveLength(1);
  });

  it("POST rejects an invalid payload with 400", async () => {
    const response = await POST(postRequest({ name: "   " }));
    expect(response.status).toBe(400);
    expect(await (await GET()).json()).toEqual([]);
  });

  it("POST rejects a slug already used in the same workspace", async () => {
    await POST(postRequest({ name: "Recetas", workspaceId: "w1" }));
    const conflict = await POST(
      postRequest({ name: "recetas", workspaceId: "w1" }),
    );
    expect(conflict.status).toBe(400);
    expect(await (await GET()).json()).toHaveLength(1);
  });

  it("POST allows the same slug in a different workspace", async () => {
    await POST(postRequest({ name: "Recetas", workspaceId: "w1" }));
    const other = await POST(
      postRequest({ name: "Recetas", workspaceId: "w2" }),
    );
    expect(other.status).toBe(201);
    expect(await (await GET()).json()).toHaveLength(2);
  });

  it("PATCH updates an existing collection", async () => {
    const record = await (
      await POST(postRequest({ name: "Old", workspaceId: "w1" }))
    ).json();
    const response = await PATCH(
      postRequest({ name: "New", workspaceId: "w1" }),
      itemContext(record.id),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: record.id, name: "New" });
  });

  it("POST without isPublic defaults it to falsy", async () => {
    const created = await (
      await POST(postRequest({ name: "Recetas", workspaceId: "w1" }))
    ).json();
    expect(created.isPublic).toBeFalsy();
  });

  it("POST with isPublic: true persists it", async () => {
    const created = await (
      await POST(
        postRequest({ name: "Recetas", workspaceId: "w1", isPublic: true }),
      )
    ).json();
    expect(created.isPublic).toBe(true);
  });

  it("PATCH updates only isPublic, leaving other fields unchanged", async () => {
    const record = await (
      await POST(postRequest({ name: "Recetas", workspaceId: "w1" }))
    ).json();
    const response = await PATCH(
      postRequest({ name: "Recetas", workspaceId: "w1", isPublic: true }),
      itemContext(record.id),
    );
    expect(response.status).toBe(200);
    const updated = await response.json();
    expect(updated).toMatchObject({
      id: record.id,
      name: "Recetas",
      slug: record.slug,
      isPublic: true,
    });
  });

  it("DELETE removes a collection and reports the outcome", async () => {
    const record = await (
      await POST(postRequest({ name: "Temp", workspaceId: "w1" }))
    ).json();

    const removed = await DELETE(postRequest({}), itemContext(record.id));
    expect(removed.status).toBe(200);
    expect(await removed.json()).toEqual({ deleted: true });

    const missing = await DELETE(postRequest({}), itemContext(record.id));
    expect(missing.status).toBe(404);
  });

  it("rejects requests with no signed-in user", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const response = await POST(postRequest({ name: "Recetas", workspaceId: "w1" }));
    expect(response.status).toBe(401);
  });
});
