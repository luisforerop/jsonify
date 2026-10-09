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

import {
  repositories,
  resetRepositories,
  setRepositories,
} from "@/lib/server/repositories";
import { makeFakeRepositories } from "@/lib/server/repositories/testing";

import { GET } from "./route";

let collectionId: string;
let schemaA: string;
let schemaB: string;

beforeEach(async () => {
  setRepositories(makeFakeRepositories());
  vi.mocked(auth).mockResolvedValue({ userId: "test-user" } as never);

  const workspace = await repositories.workspaces.create({
    name: "WS",
    slug: "ws",
    ownerId: "test-user",
  });
  const collection = await repositories.collections.create({
    workspaceId: workspace.id,
    name: "Col",
    slug: "col",
  });
  collectionId = collection.id;
  const definition = { type: "object" } as never;
  schemaA = (
    await repositories.schemas.create({
      collectionId,
      name: "A",
      schemaDefinition: definition,
    })
  ).id;
  schemaB = (
    await repositories.schemas.create({
      collectionId,
      name: "B",
      schemaDefinition: definition,
    })
  ).id;
  for (let i = 0; i < 5; i++) {
    await repositories.records.create({
      workspaceId: workspace.id,
      collectionId,
      schemaId: i < 3 ? schemaA : schemaB,
      payload: { n: i },
    });
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
});

afterEach(() => {
  resetRepositories();
  vi.restoreAllMocks();
});

function get(query: string): Promise<Response> {
  return GET(new Request(`http://localhost/api/records?${query}`));
}

describe("GET /api/records (paginated)", () => {
  it("returns the newest records first with the total", async () => {
    const body = await (await get(`collectionId=${collectionId}&page=1&pageSize=2`)).json();
    expect(body.total).toBe(5);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(2);
    expect(body.rows.map((r: { payload: { n: number } }) => r.payload.n)).toEqual([4, 3]);
  });

  it("pages without repeating or skipping rows", async () => {
    const second = await (await get(`collectionId=${collectionId}&page=2&pageSize=2`)).json();
    const third = await (await get(`collectionId=${collectionId}&page=3&pageSize=2`)).json();
    expect(second.rows.map((r: { payload: { n: number } }) => r.payload.n)).toEqual([2, 1]);
    expect(third.rows.map((r: { payload: { n: number } }) => r.payload.n)).toEqual([0]);
  });

  it("returns an empty page beyond the last one", async () => {
    const response = await get(`collectionId=${collectionId}&page=9&pageSize=2`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.rows).toEqual([]);
    expect(body.total).toBe(5);
  });

  it("filters by schema and reports the filtered total", async () => {
    const body = await (
      await get(`collectionId=${collectionId}&schemaId=${schemaB}&page=1&pageSize=10`)
    ).json();
    expect(body.total).toBe(2);
    expect(body.rows.every((r: { schemaId: string }) => r.schemaId === schemaB)).toBe(true);
  });

  it("clamps the page size to 100", async () => {
    const body = await (await get(`collectionId=${collectionId}&page=1&pageSize=5000`)).json();
    expect(body.pageSize).toBe(100);
  });

  it("requires collectionId when paginating", async () => {
    expect((await get("page=1")).status).toBe(400);
  });

  it("returns 404 for a collection in a workspace the user does not belong to", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "someone-else" } as never);
    expect((await get(`collectionId=${collectionId}&page=1`)).status).toBe(404);
  });

  it("returns 404 for an unknown collection", async () => {
    expect((await get("collectionId=nope&page=1")).status).toBe(404);
  });

  it("returns 401 when signed out", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    expect((await get(`collectionId=${collectionId}&page=1`)).status).toBe(401);
  });

  it("still lists every record when no page is given", async () => {
    const response = await GET(new Request("http://localhost/api/records"));
    expect(await response.json()).toHaveLength(5);
  });
});
