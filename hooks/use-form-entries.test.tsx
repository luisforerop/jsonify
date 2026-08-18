import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useFormEntries } from "./use-form-entries";

const values = { name: "Ada" };

afterEach(() => {
  window.localStorage.clear();
});

describe("useFormEntries", () => {
  it("creates, reads, updates, and deletes a locally saved form entry", async () => {
    const { result, unmount } = renderHook(() => useFormEntries());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    let id = "";
    act(() => {
      id =
        result.current.create({
          name: "Ada's profile",
          schemaId: "schema-1",
          schemaName: "Customer",
          values,
        })?.id ?? "";
    });
    expect(result.current.entries).toHaveLength(1);
    expect(
      JSON.parse(
        window.localStorage.getItem("jsonify.form-entries.v1") ?? "[]",
      ),
    ).toHaveLength(1);

    act(() => {
      result.current.update(id, {
        name: "Ada's updated profile",
        schemaId: "schema-1",
        schemaName: "Customer",
        values: { name: "Grace" },
      });
    });
    expect(result.current.entries[0]?.name).toBe("Ada's updated profile");
    expect(result.current.entries[0]?.values).toEqual({ name: "Grace" });

    unmount();
    const loaded = renderHook(() => useFormEntries());
    await waitFor(() =>
      expect(loaded.result.current.entries[0]?.values).toEqual({
        name: "Grace",
      }),
    );

    act(() => {
      loaded.result.current.remove(id);
    });
    expect(loaded.result.current.entries).toHaveLength(0);
  });
});
