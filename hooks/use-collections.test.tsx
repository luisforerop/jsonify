import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { installCollectionFetchStub } from "./collection-fetch-stub";
import { useCollections } from "./use-collections";

const workspaceId = "workspace-1";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useCollections", () => {
  it("loads collections from the API on mount", async () => {
    const { calls } = installCollectionFetchStub("/api/collections");
    const { result } = renderHook(() => useCollections(workspaceId));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(calls[0]).toMatchObject({ method: "GET", url: "/api/collections" });
    expect(result.current.collections).toEqual([]);
  });

  it("creates, updates, and deletes a collection through the API", async () => {
    const { store, calls } = installCollectionFetchStub("/api/collections");
    const { result } = renderHook(() => useCollections(workspaceId));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    let id = "";
    await act(async () => {
      id =
        (await result.current.create({ name: "Recetas", workspaceId }))?.id ??
        "";
    });
    expect(result.current.collections).toHaveLength(1);
    expect(store).toHaveLength(1);
    expect(calls.at(-1)).toMatchObject({
      method: "POST",
      url: "/api/collections",
      body: { name: "Recetas", workspaceId },
    });

    await act(async () => {
      await result.current.update(id, { name: "Recetas y menús", workspaceId });
    });
    expect(result.current.collections[0]?.name).toBe("Recetas y menús");

    await act(async () => {
      await result.current.remove(id);
    });
    expect(result.current.collections).toHaveLength(0);
    expect(store).toHaveLength(0);
  });

  it("scopes the returned collections to the given workspace", async () => {
    const { store } = installCollectionFetchStub("/api/collections");
    store.push(
      {
        id: "a1",
        name: "Recetas",
        slug: "recetas",
        description: "",
        workspaceId: "a",
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "b1",
        name: "Facturas",
        slug: "facturas",
        description: "",
        workspaceId: "b",
        createdAt: "",
        updatedAt: "",
      },
    );

    const scopedToA = renderHook(() => useCollections("a"));
    await waitFor(() => expect(scopedToA.result.current.isLoaded).toBe(true));
    expect(scopedToA.result.current.collections).toHaveLength(1);
    expect(scopedToA.result.current.collections[0]?.name).toBe("Recetas");
  });

  it("surfaces the server message when a name is already taken", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: string | URL, init?: RequestInit) => {
        if ((init?.method ?? "GET") === "GET") {
          return new Response("[]", { status: 200 });
        }
        return new Response(
          JSON.stringify({ error: "That name is already taken here" }),
          { status: 400 },
        );
      }),
    );
    const { result } = renderHook(() => useCollections(workspaceId));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.create({ name: "Recetas", workspaceId });
    });
    expect(result.current.error).toBe("That name is already taken here");
  });

  it("surfaces an error when the API is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network down"))),
    );
    const { result } = renderHook(() => useCollections(workspaceId));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.error).toBe(
      "Saved collections are unavailable right now.",
    );
  });
});
