import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { installCollectionFetchStub } from "./collection-fetch-stub";
import { useWorkspaces } from "./use-workspaces";

const ownerId = "user-1";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useWorkspaces", () => {
  it("creates a workspace and scopes results to the given owner", async () => {
    const { store } = installCollectionFetchStub("/api/workspaces");
    store.push({
      id: "other",
      name: "Someone else",
      slug: "someone-else",
      ownerId: "user-2",
      createdAt: "",
      updatedAt: "",
    });

    const { result } = renderHook(() => useWorkspaces(ownerId));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.workspaces).toHaveLength(0);

    await act(async () => {
      await result.current.create({ name: "Clean Fuel", ownerId });
    });
    expect(result.current.workspaces).toHaveLength(1);
    expect(result.current.workspaces[0]?.ownerId).toBe(ownerId);
  });

  it("surfaces the server message when a workspace name is taken", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        if ((init?.method ?? "GET") === "GET") {
          return new Response("[]", { status: 200 });
        }
        return new Response(
          JSON.stringify({ error: "That name is already taken here" }),
          { status: 400 },
        );
      }),
    );
    const { result } = renderHook(() => useWorkspaces(ownerId));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.create({ name: "Clean Fuel", ownerId });
    });
    expect(result.current.error).toBe("That name is already taken here");
  });
});
