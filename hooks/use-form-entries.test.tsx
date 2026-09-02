import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { installCollectionFetchStub } from "./collection-fetch-stub";
import { useFormEntries } from "./use-form-entries";

const values = { name: "Ada" };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useFormEntries", () => {
  it("creates, updates, and deletes a saved form entry through the API", async () => {
    const { store, calls } = installCollectionFetchStub("/api/form-entries");
    const { result } = renderHook(() => useFormEntries());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    let id = "";
    await act(async () => {
      id =
        (
          await result.current.create({
            name: "Ada's profile",
            schemaId: "schema-1",
            schemaName: "Customer",
            values,
          })
        )?.id ?? "";
    });
    expect(result.current.entries).toHaveLength(1);
    expect(store).toHaveLength(1);
    expect(calls.at(-1)).toMatchObject({
      method: "POST",
      url: "/api/form-entries",
    });

    await act(async () => {
      await result.current.update(id, {
        name: "Ada's updated profile",
        schemaId: "schema-1",
        schemaName: "Customer",
        values: { name: "Grace" },
      });
    });
    expect(result.current.entries[0]?.name).toBe("Ada's updated profile");
    expect(result.current.entries[0]?.values).toEqual({ name: "Grace" });

    await act(async () => {
      await result.current.remove(id);
    });
    expect(result.current.entries).toHaveLength(0);
  });

  it("surfaces an error when the API is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network down"))),
    );
    const { result } = renderHook(() => useFormEntries());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.error).toBe(
      "Saved form entries are unavailable right now.",
    );
  });
});
