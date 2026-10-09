import { describe, expect, it } from "vitest";

import { deriveColumns, describeCell } from "@/lib/records-table";

describe("describeCell", () => {
  it("distinguishes missing, null, and empty string", () => {
    expect(describeCell(undefined)).toEqual({ kind: "missing" });
    expect(describeCell(null)).toEqual({ kind: "null" });
    expect(describeCell("")).toEqual({ kind: "text", text: "" });
  });

  it("renders primitives as text", () => {
    expect(describeCell(0)).toEqual({ kind: "text", text: "0" });
    expect(describeCell(false)).toEqual({ kind: "text", text: "false" });
  });

  it("marks empty containers", () => {
    expect(describeCell([])).toEqual({ kind: "empty", container: "array" });
    expect(describeCell({})).toEqual({ kind: "empty", container: "object" });
  });

  it("previews the first items of a primitive array", () => {
    expect(describeCell(["a", "b", "c", "d"])).toEqual({
      kind: "list",
      count: 4,
      preview: ["a", "b", "c"],
      more: 1,
    });
  });

  it("summarises arrays of objects or mixed values by count", () => {
    expect(describeCell([{ a: 1 }, { a: 2 }])).toEqual({
      kind: "items",
      count: 2,
    });
    expect(describeCell([1, null])).toEqual({ kind: "items", count: 2 });
  });

  it("previews the first pairs of an object, collapsing nested containers", () => {
    expect(describeCell({ city: "Bogotá", tags: ["x"], zip: 1 })).toEqual({
      kind: "object",
      count: 3,
      preview: [
        { key: "city", value: "Bogotá" },
        { key: "tags", value: "[…]" },
      ],
      more: 1,
    });
  });
});

describe("deriveColumns", () => {
  it("uses the schema's properties in schema order", () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
        tags: { type: "array", items: { type: "string" } },
      },
    } as const;
    expect(deriveColumns(schema, [{ other: 1 }])).toEqual([
      "name",
      "age",
      "tags",
    ]);
  });

  it("unions payload keys in first-seen order without a schema", () => {
    expect(deriveColumns(null, [{ a: 1, b: 2 }, { b: 3, c: 4 }])).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("returns no columns for a schema without properties", () => {
    expect(deriveColumns({ type: "object" }, [])).toEqual([]);
  });
});
