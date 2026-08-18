import { describe, expect, it } from "vitest";

import {
  createJsonSchema,
  validateSchema,
  type BuilderNode,
} from "./schema-builder";

describe("schema builder", () => {
  const properties: BuilderNode[] = [
    {
      id: "profile",
      name: "profile",
      type: "object",
      required: true,
      properties: [
        { id: "email", name: "email", type: "string", required: true },
      ],
    },
    {
      id: "tags",
      name: "tags",
      type: "array",
      required: false,
      items: {
        id: "item",
        name: "items",
        type: "object",
        required: false,
        properties: [
          { id: "label", name: "label", type: "string", required: true },
        ],
      },
    },
  ];

  it("creates required fields in root, nested objects, and object arrays", () => {
    expect(createJsonSchema("Customer", properties)).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Customer",
      type: "object",
      properties: {
        profile: {
          type: "object",
          properties: { email: { type: "string" } },
          required: ["email"],
        },
        tags: {
          type: "array",
          items: {
            type: "object",
            properties: { label: { type: "string" } },
            required: ["label"],
          },
        },
      },
      required: ["profile"],
    });
  });

  it("requires a title and unique non-empty property names at every level", () => {
    const invalid = validateSchema("", [
      { id: "first", name: "", type: "string", required: false },
      { id: "second", name: "name", type: "string", required: false },
      { id: "third", name: "name", type: "number", required: false },
    ]);

    expect(invalid.isValid).toBe(false);
    expect(invalid.errors).toContain("Enter a name for this schema.");
    expect(invalid.errors).toContain("Root property 1 needs a name.");
    expect(invalid.errors).toContain(
      "Root cannot contain duplicate property names.",
    );
  });
});
