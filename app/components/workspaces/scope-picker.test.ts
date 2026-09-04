import { describe, expect, it } from "vitest";

import { summarizeScopes } from "./scope-picker";

const collections = [{ slug: "recetas", name: "Recetas" }];

describe("summarizeScopes", () => {
  it("collapses a bare wildcard scope into a single full-access line", () => {
    expect(summarizeScopes(["*"], collections)).toEqual([
      "Full access to everything",
    ]);
  });

  it("groups multiple actions on the same collection into one line", () => {
    expect(
      summarizeScopes(["write:recetas", "read:recetas"], collections),
    ).toEqual(["Recetas: Read, Write"]);
  });

  it("labels an action wildcard as All collections", () => {
    expect(summarizeScopes(["read:*"], collections)).toEqual([
      "All collections: Read",
    ]);
  });

  it("falls back to the raw slug when the collection is unknown", () => {
    expect(summarizeScopes(["delete:archived"], collections)).toEqual([
      "archived: Delete",
    ]);
  });

  it("produces one line per distinct target", () => {
    expect(
      summarizeScopes(["read:*", "write:recetas"], collections),
    ).toEqual(["All collections: Read", "Recetas: Write"]);
  });
});
