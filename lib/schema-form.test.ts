import { describe, expect, it } from "vitest";

import type { JsonSchema } from "./schema-builder";
import {
  addArrayItem,
  createInitialValues,
  deriveFormFields,
  removeArrayItem,
  setValueAtPath,
  validateFormValues,
} from "./schema-form";

const schema: JsonSchema = {
  title: "Customer",
  type: "object",
  properties: {
    name: { type: "string" },
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
  required: ["name", "profile"],
};

describe("deriveFormFields", () => {
  it("derives fields, including nested objects and array items, with required flags", () => {
    const fields = deriveFormFields(schema);

    expect(fields).toEqual([
      { name: "name", type: "string", required: true },
      {
        name: "profile",
        type: "object",
        required: true,
        properties: [{ name: "email", type: "string", required: true }],
      },
      {
        name: "tags",
        type: "array",
        required: false,
        items: {
          name: "items",
          type: "object",
          required: false,
          properties: [{ name: "label", type: "string", required: true }],
        },
      },
    ]);
  });
});

describe("createInitialValues", () => {
  it("creates an empty values object matching the field tree shape", () => {
    const fields = deriveFormFields(schema);

    expect(createInitialValues(fields)).toEqual({
      name: "",
      profile: { email: "" },
      tags: [],
    });
  });
});

describe("validateFormValues", () => {
  it("reports missing required fields at every nesting level", () => {
    const fields = deriveFormFields(schema);
    const values = createInitialValues(fields);

    const validation = validateFormValues(fields, values);

    expect(validation.isValid).toBe(false);
    expect(validation.missingFields).toEqual(["name", "profile.email"]);
  });

  it("passes when every required field is filled in", () => {
    const fields = deriveFormFields(schema);

    const validation = validateFormValues(fields, {
      name: "Ada",
      profile: { email: "ada@example.com" },
      tags: [],
    });

    expect(validation.isValid).toBe(true);
    expect(validation.missingFields).toEqual([]);
  });
});

describe("path-based value helpers", () => {
  it("sets a nested value without mutating the original object", () => {
    const values = { profile: { email: "" } };

    const next = setValueAtPath(
      values,
      ["profile", "email"],
      "ada@example.com",
    );

    expect(next).toEqual({ profile: { email: "ada@example.com" } });
    expect(values).toEqual({ profile: { email: "" } });
  });

  it("adds and removes array items by index", () => {
    const values = { tags: [{ label: "a" }] };

    const withNewItem = addArrayItem(values, ["tags"], { label: "b" });
    expect(withNewItem.tags).toEqual([{ label: "a" }, { label: "b" }]);

    const withoutFirst = removeArrayItem(withNewItem, ["tags"], 0);
    expect(withoutFirst.tags).toEqual([{ label: "b" }]);
  });
});
