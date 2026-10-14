import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(async () => ({
    fullName: "Test User",
    username: "testuser",
    primaryEmailAddress: { emailAddress: "test@example.com" },
  })),
}));

import { auth } from "@clerk/nextjs/server";

import { repositories, setRepositories } from "@/lib/server/repositories";
import { makeFakeRepositories } from "@/lib/server/repositories/testing";

import { PATCH } from "./route";

let schemaId: string;

beforeEach(async () => {
  setRepositories(makeFakeRepositories());
  vi.mocked(auth).mockResolvedValue({ userId: "member" } as never);
  const workspace = await repositories.workspaces.create({
    name: "WS",
    slug: "ws",
    ownerId: "member",
  });
  await repositories.workspaceMembers.create({
    workspaceId: workspace.id,
    userId: "member",
    role: "owner",
  });
  const collection = await repositories.collections.create({
    workspaceId: workspace.id,
    name: "Col",
    slug: "col",
  });
  schemaId = (
    await repositories.schemas.create({
      collectionId: collection.id,
      name: "S",
      schemaDefinition: { type: "object" } as never,
    })
  ).id;
});

const call = (body: unknown, id = schemaId) =>
  PATCH(
    new Request("http://x", { method: "PATCH", body: JSON.stringify(body) }),
    { params: Promise.resolve({ id }) } as never,
  );

describe("PATCH /api/schemas/[id]/sharing", () => {
  it("lets a member toggle sharing", async () => {
    const on = await call({ enabled: true });
    expect(on.status).toBe(200);
    expect((await repositories.schemas.findById(schemaId))?.sharingEnabled).toBe(true);
    await call({ enabled: false });
    expect((await repositories.schemas.findById(schemaId))?.sharingEnabled).toBe(false);
  });

  it("rejects unauthenticated callers", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    expect((await call({ enabled: true })).status).toBe(401);
  });

  it("hides the schema from non-members", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "stranger" } as never);
    expect((await call({ enabled: true })).status).toBe(404);
    expect((await repositories.schemas.findById(schemaId))?.sharingEnabled).toBe(false);
  });

  it("rejects an invalid body and unknown schema", async () => {
    expect((await call({ enabled: "yes" })).status).toBe(400);
    expect(
      (await call({ enabled: true }, "00000000-0000-4000-8000-000000000000")).status,
    ).toBe(404);
  });
});
