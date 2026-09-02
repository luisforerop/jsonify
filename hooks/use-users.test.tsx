import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { installCollectionFetchStub } from "./collection-fetch-stub";
import { useUsers } from "./use-users";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useUsers", () => {
  it("loads users on mount and creates one through the API", async () => {
    const { store, calls } = installCollectionFetchStub("/api/users");
    const { result } = renderHook(() => useUsers());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(calls[0]).toMatchObject({ method: "GET", url: "/api/users" });

    await act(async () => {
      await result.current.create({
        name: "Carlos",
        email: "carlos@example.com",
        password: "secret",
      });
    });
    expect(result.current.users).toHaveLength(1);
    expect(store).toHaveLength(1);
    expect(calls.at(-1)).toMatchObject({ method: "POST", url: "/api/users" });
  });

  it("surfaces an error when the API is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network down"))),
    );
    const { result } = renderHook(() => useUsers());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.error).toBe(
      "Saved users are unavailable right now.",
    );
  });
});
