import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { installCollectionFetchStub } from "./collection-fetch-stub";
import { useWorkspaces } from "./use-workspaces";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useWorkspaces", () => {
  it("lists what the server returns and appends a created workspace", async () => {
    const { store } = installCollectionFetchStub("/api/workspaces");
    store.push({
      id: "existing",
      name: "Existing",
      slug: "existing",
      ownerId: "user-1",
      createdAt: "",
      updatedAt: "",
    });

    const { result } = renderHook(() => useWorkspaces());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.workspaces).toHaveLength(1);

    await act(async () => {
      await result.current.create({ name: "Clean Fuel" });
    });
    expect(result.current.workspaces).toHaveLength(2);
    expect(result.current.workspaces[1]?.name).toBe("Clean Fuel");
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
    const { result } = renderHook(() => useWorkspaces());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.create({ name: "Clean Fuel" });
    });
    expect(result.current.error).toBe("That name is already taken here");
  });
});
