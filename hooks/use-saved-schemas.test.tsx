import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { installCollectionFetchStub } from "./collection-fetch-stub";
import { useSavedSchemas } from "./use-saved-schemas";

const schema = { title: "Profile", type: "object" as const, properties: {} };
const workspaceId = "workspace-1";
const collectionId = "collection-1";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useSavedSchemas", () => {
  it("creates, updates, and deletes a saved schema through the API", async () => {
    const { store, calls } = installCollectionFetchStub("/api/schemas");
    const { result } = renderHook(() => useSavedSchemas(collectionId));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    let id = "";
    await act(async () => {
      id =
        (
          await result.current.create({
            name: "Profile",
            schema,
            workspaceId,
            collectionId,
          })
        )?.id ?? "";
    });
    expect(result.current.schemas).toHaveLength(1);
    expect(store).toHaveLength(1);
    expect(calls.at(-1)).toMatchObject({
      method: "POST",
      url: "/api/schemas",
      body: { name: "Profile", workspaceId, collectionId },
    });

    await act(async () => {
      await result.current.update(id, {
        name: "Account",
        schema: { ...schema, title: "Account" },
        workspaceId,
        collectionId,
      });
    });
    expect(result.current.schemas[0]?.name).toBe("Account");

    await act(async () => {
      await result.current.remove(id);
    });
    expect(result.current.schemas).toHaveLength(0);
  });

  it("scopes the returned schemas to the given collection", async () => {
    const { store } = installCollectionFetchStub("/api/schemas");
    store.push(
      {
        id: "a1",
        name: "Profile",
        schema,
        workspaceId,
        collectionId: "a",
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "b1",
        name: "Invoice",
        schema,
        workspaceId,
        collectionId: "b",
        createdAt: "",
        updatedAt: "",
      },
    );

    const scopedToA = renderHook(() => useSavedSchemas("a"));
    await waitFor(() => expect(scopedToA.result.current.isLoaded).toBe(true));
    expect(scopedToA.result.current.schemas).toHaveLength(1);
    expect(scopedToA.result.current.schemas[0]?.name).toBe("Profile");

    const unscoped = renderHook(() => useSavedSchemas());
    await waitFor(() => expect(unscoped.result.current.isLoaded).toBe(true));
    expect(unscoped.result.current.schemas).toHaveLength(2);
  });

  it("surfaces an error when the API is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network down"))),
    );
    const { result } = renderHook(() => useSavedSchemas(collectionId));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.error).toBe(
      "Saved schemas are unavailable right now.",
    );
  });
});
