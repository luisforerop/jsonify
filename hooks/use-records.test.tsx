import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { installCollectionFetchStub } from "./collection-fetch-stub";
import { useRecords } from "./use-records";

const values = { name: "Ada" };
const collectionId = "collection-1";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useRecords", () => {
  it("creates, updates, and deletes a record through the API", async () => {
    const { store, calls } = installCollectionFetchStub("/api/records");
    const { result } = renderHook(() => useRecords(collectionId));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    let id = "";
    await act(async () => {
      id =
        (
          await result.current.create({
            name: "Ada's profile",
            collectionId,
            schemaId: "schema-1",
            schemaName: "Customer",
            values,
          })
        )?.id ?? "";
    });
    expect(result.current.records).toHaveLength(1);
    expect(store).toHaveLength(1);
    expect(calls.at(-1)).toMatchObject({
      method: "POST",
      url: "/api/records",
    });

    await act(async () => {
      await result.current.update(id, {
        name: "Ada's updated profile",
        collectionId,
        schemaId: "schema-1",
        schemaName: "Customer",
        values: { name: "Grace" },
      });
    });
    expect(result.current.records[0]?.name).toBe("Ada's updated profile");
    expect(result.current.records[0]?.values).toEqual({ name: "Grace" });

    await act(async () => {
      await result.current.remove(id);
    });
    expect(result.current.records).toHaveLength(0);
  });

  it("scopes the returned records to the given collection", async () => {
    const { store } = installCollectionFetchStub("/api/records");
    store.push(
      {
        id: "a1",
        name: "Ada",
        collectionId: "a",
        schemaId: "s1",
        schemaName: "Customer",
        values,
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "b1",
        name: "Grace",
        collectionId: "b",
        schemaId: "s1",
        schemaName: "Customer",
        values,
        createdAt: "",
        updatedAt: "",
      },
    );

    const scopedToA = renderHook(() => useRecords("a"));
    await waitFor(() => expect(scopedToA.result.current.isLoaded).toBe(true));
    expect(scopedToA.result.current.records).toHaveLength(1);
    expect(scopedToA.result.current.records[0]?.name).toBe("Ada");
  });

  it("surfaces an error when the API is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network down"))),
    );
    const { result } = renderHook(() => useRecords(collectionId));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.error).toBe(
      "Saved records are unavailable right now.",
    );
  });
});
