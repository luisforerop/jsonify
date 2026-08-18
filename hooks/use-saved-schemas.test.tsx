import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useSavedSchemas } from "./use-saved-schemas";

const schema = { title: "Profile", type: "object" as const, properties: {} };

afterEach(() => {
  window.localStorage.clear();
});

describe("useSavedSchemas", () => {
  it("creates, reads, updates, and deletes a locally saved schema", async () => {
    const { result, unmount } = renderHook(() => useSavedSchemas());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    let id = "";
    act(() => {
      id = result.current.create({ name: "Profile", schema })?.id ?? "";
    });
    expect(result.current.schemas).toHaveLength(1);
    expect(
      JSON.parse(
        window.localStorage.getItem("jsonify.saved-schemas.v1") ?? "[]",
      ),
    ).toHaveLength(1);

    act(() => {
      result.current.update(id, {
        name: "Account",
        schema: { ...schema, title: "Account" },
      });
    });
    expect(result.current.schemas[0]?.name).toBe("Account");

    unmount();
    const loaded = renderHook(() => useSavedSchemas());
    await waitFor(() =>
      expect(loaded.result.current.schemas[0]?.name).toBe("Account"),
    );

    act(() => {
      loaded.result.current.remove(id);
    });
    expect(loaded.result.current.schemas).toHaveLength(0);
  });
});
