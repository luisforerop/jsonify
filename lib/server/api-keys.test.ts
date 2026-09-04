import { describe, expect, it } from "vitest";

import { hasScope, isValidScope } from "./api-keys";

describe("hasScope", () => {
  it("grants everything for the wildcard scope", () => {
    expect(hasScope(["*"], "write", "recetas")).toBe(true);
    expect(hasScope(["*"], "delete", "postres")).toBe(true);
  });

  it("grants every collection for an action wildcard", () => {
    expect(hasScope(["read:*"], "read", "recetas")).toBe(true);
    expect(hasScope(["read:*"], "read", "postres")).toBe(true);
  });

  it("matches an exact action:slug scope", () => {
    expect(hasScope(["write:recetas"], "write", "recetas")).toBe(true);
  });

  it("rejects a scope for a different collection slug", () => {
    expect(hasScope(["write:recetas"], "write", "postres")).toBe(false);
  });

  it("rejects a scope with an insufficient action", () => {
    expect(hasScope(["read:recetas"], "write", "recetas")).toBe(false);
  });
});

describe("isValidScope", () => {
  it("accepts the wildcard scope", () => {
    expect(isValidScope("*")).toBe(true);
  });

  it("accepts an action wildcard", () => {
    expect(isValidScope("read:*")).toBe(true);
    expect(isValidScope("write:*")).toBe(true);
    expect(isValidScope("delete:*")).toBe(true);
  });

  it("accepts an action:slug scope", () => {
    expect(isValidScope("write:recetas")).toBe(true);
    expect(isValidScope("delete:my-collection")).toBe(true);
  });

  it("rejects an unknown action", () => {
    expect(isValidScope("admin:recetas")).toBe(false);
  });

  it("rejects an action with no target", () => {
    expect(isValidScope("read")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidScope("")).toBe(false);
  });
});
