import { describe, expect, it } from "vitest";

import type { JsonSchema } from "./schema-builder";
import {
  addArrayItem,
  createInitialValues,
  deriveFormFields,
  formValuesFromJson,
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

describe("formValuesFromJson", () => {
  const importSchema: JsonSchema = {
    title: "Person",
    type: "object",
    properties: {
      name: { type: "string" },
      age: { type: "integer" },
      active: { type: "boolean" },
      address: {
        type: "object",
        properties: { city: { type: "string" } },
      },
      tags: { type: "array", items: { type: "string" } },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: { sku: { type: "string" } },
        },
      },
    },
  };
  const importFields = deriveFormFields(importSchema);

  function fill(input: string) {
    const result = formValuesFromJson(input, importFields);
    if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
    return result.values;
  }

  it("populates scalar fields, coercing values to the field type", () => {
    const values = fill(
      JSON.stringify({ name: "Ada", age: "42", active: true }),
    );

    expect(values.name).toBe("Ada");
    expect(values.age).toBe(42);
    expect(values.active).toBe(true);
  });

  it("coerces a non-numeric string in a number field to an empty value", () => {
    expect(fill(JSON.stringify({ age: "not a number" })).age).toBe("");
  });

  it("coerces a non-boolean into false for a boolean field", () => {
    expect(fill(JSON.stringify({ active: "yes" })).active).toBe(false);
  });

  it("populates nested object properties", () => {
    const values = fill(JSON.stringify({ address: { city: "Paris" } }));

    expect(values.address).toEqual({ city: "Paris" });
  });

  it("falls back to initial values when an object member is missing or not an object", () => {
    expect(fill("{}").address).toEqual({ city: "" });
    expect(fill(JSON.stringify({ address: "nope" })).address).toEqual({
      city: "",
    });
  });

  it("populates an array of scalars", () => {
    expect(fill(JSON.stringify({ tags: ["a", "b"] })).tags).toEqual(["a", "b"]);
  });

  it("populates an array of objects, conforming each entry", () => {
    expect(
      fill(JSON.stringify({ items: [{ sku: "X1" }, { sku: "X2" }] })).items,
    ).toEqual([{ sku: "X1" }, { sku: "X2" }]);
  });

  it("treats a non-array member as an empty array", () => {
    expect(fill(JSON.stringify({ tags: "a" })).tags).toEqual([]);
  });

  it("drops keys with no matching field and keeps absent fields at their initial value", () => {
    const values = fill(JSON.stringify({ name: "Ada", unknown: "ignored" }));
    const initial = createInitialValues(importFields);

    expect(values).not.toHaveProperty("unknown");
    expect(values.name).toBe("Ada");
    expect(values).toEqual({ ...initial, name: "Ada" });
  });

  it("rejects invalid JSON without changing anything", () => {
    const result = formValuesFromJson("{ not json", importFields);

    expect(result).toEqual({
      ok: false,
      error: "Enter valid JSON to fill the form.",
    });
  });

  it("rejects a non-object top-level value", () => {
    for (const input of ["[1, 2]", '"text"', "42", "true", "null"]) {
      const result = formValuesFromJson(input, importFields);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(
          'Paste a JSON object, for example { "name": "value" }.',
        );
      }
    }
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
