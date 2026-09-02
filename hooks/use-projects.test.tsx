import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { installCollectionFetchStub } from "./collection-fetch-stub";
import { useProjects } from "./use-projects";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useProjects", () => {
  it("loads projects from the API on mount", async () => {
    const { calls } = installCollectionFetchStub("/api/projects");
    const { result } = renderHook(() => useProjects());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(calls[0]).toMatchObject({ method: "GET", url: "/api/projects" });
    expect(result.current.projects).toEqual([]);
  });

  it("creates, updates, and deletes a project through the API", async () => {
    const { store, calls } = installCollectionFetchStub("/api/projects");
    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    let id = "";
    await act(async () => {
      id = (await result.current.create({ name: "Onboarding" }))?.id ?? "";
    });
    expect(result.current.projects).toHaveLength(1);
    expect(store).toHaveLength(1);
    expect(calls.at(-1)).toMatchObject({
      method: "POST",
      url: "/api/projects",
      body: { name: "Onboarding" },
    });

    await act(async () => {
      await result.current.update(id, { name: "Customer Onboarding" });
    });
    expect(result.current.projects[0]?.name).toBe("Customer Onboarding");
    expect(calls.at(-1)).toMatchObject({
      method: "PATCH",
      url: `/api/projects/${id}`,
    });

    await act(async () => {
      await result.current.remove(id);
    });
    expect(result.current.projects).toHaveLength(0);
    expect(store).toHaveLength(0);
    expect(calls.at(-1)).toMatchObject({
      method: "DELETE",
      url: `/api/projects/${id}`,
    });
  });

  it("surfaces an error when the API is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network down"))),
    );
    const { result } = renderHook(() => useProjects());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.error).toBe(
      "Saved projects are unavailable right now.",
    );
  });

  it("surfaces an error when a delete targets a missing project", async () => {
    installCollectionFetchStub("/api/projects");
    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    let removed = true;
    await act(async () => {
      removed = await result.current.remove("missing");
    });
    expect(removed).toBe(false);
    expect(result.current.error).toBe("The selected project no longer exists.");
  });
});
