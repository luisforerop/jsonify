import { describe, expect, it } from "vitest";

import {
  changeNodeType,
  createBuilderNode,
  createJsonSchema,
  propertiesFromJsonSchema,
  schemaFromSampleJson,
  validateSchema,
  type BuilderNode,
} from "./schema-builder";

function sequentialId(): () => string {
  let counter = 0;
  return () => `id-${(counter += 1)}`;
}

function importProperties(input: string): BuilderNode[] {
  const result = schemaFromSampleJson(input, sequentialId());
  if (!result.ok) {
    throw new Error(`expected ok result, got error: ${result.error}`);
  }
  return result.properties;
}

function findProperty(nodes: BuilderNode[], name: string): BuilderNode {
  const node = nodes.find((candidate) => candidate.name === name);
  if (!node) {
    throw new Error(`property ${name} not found`);
  }
  return node;
}

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

describe("schemaFromSampleJson", () => {
  it("infers string and integer properties from a flat object", () => {
    const properties = importProperties('{ "test": "abc", "numeros": 123 }');

    expect(findProperty(properties, "test").type).toBe("string");
    expect(findProperty(properties, "numeros").type).toBe("integer");
  });

  it("distinguishes non-integral numbers from integers", () => {
    const properties = importProperties('{ "price": 9.99, "count": 4 }');

    expect(findProperty(properties, "price").type).toBe("number");
    expect(findProperty(properties, "count").type).toBe("integer");
  });

  it("infers nested object properties recursively", () => {
    const properties = importProperties(
      '{ "address": { "city": "x", "zip": 10 } }',
    );
    const address = findProperty(properties, "address");

    expect(address.type).toBe("object");
    expect(findProperty(address.properties ?? [], "city").type).toBe("string");
    expect(findProperty(address.properties ?? [], "zip").type).toBe("integer");
  });

  it("infers an array of scalars with a scalar item type", () => {
    const tags = findProperty(importProperties('{ "tags": ["a", "b"] }'), "tags");

    expect(tags.type).toBe("array");
    expect(tags.items?.type).toBe("string");
  });

  it("infers an array of objects from the first element", () => {
    const items = findProperty(
      importProperties('{ "items": [{ "sku": "abc" }] }'),
      "items",
    );

    expect(items.type).toBe("array");
    expect(items.items?.type).toBe("object");
    expect(findProperty(items.items?.properties ?? [], "sku").type).toBe(
      "string",
    );
  });

  it("treats an empty array as an array of strings", () => {
    const list = findProperty(importProperties('{ "list": [] }'), "list");

    expect(list.type).toBe("array");
    expect(list.items?.type).toBe("string");
  });

  it("infers a null-valued member as a null property", () => {
    expect(findProperty(importProperties('{ "empty": null }'), "empty").type).toBe(
      "null",
    );
  });

  it("infers a boolean property", () => {
    expect(
      findProperty(importProperties('{ "active": true }'), "active").type,
    ).toBe("boolean");
  });

  it("rejects invalid JSON without generating a schema", () => {
    const result = schemaFromSampleJson("{ not json", sequentialId());

    expect(result).toEqual({
      ok: false,
      error: "Enter valid JSON to generate a schema.",
    });
  });

  it("rejects non-object top-level values", () => {
    const message = 'Paste a JSON object, for example { "name": "value" }.';

    for (const input of ["[1, 2]", '"abc"', "123", "true", "null"]) {
      expect(schemaFromSampleJson(input, sequentialId())).toEqual({
        ok: false,
        error: message,
      });
    }
  });
});

describe("enum properties", () => {
  const enumNode = (overrides: Partial<BuilderNode> = {}): BuilderNode => ({
    id: "e",
    name: "status",
    type: "enum",
    required: false,
    enumValues: ["draft", "published"],
    ...overrides,
  });

  it("emits a string schema constrained by enum", () => {
    const schema = createJsonSchema("Post", [enumNode()]);

    expect(schema.properties?.status).toEqual({
      type: "string",
      enum: ["draft", "published"],
    });
  });

  it("emits enum array items", () => {
    const array: BuilderNode = {
      id: "a",
      name: "states",
      type: "array",
      required: false,
      items: enumNode({ name: "items", enumValues: ["a", "b"] }),
    };

    expect(createJsonSchema("Post", [array]).properties?.states).toEqual({
      type: "array",
      items: { type: "string", enum: ["a", "b"] },
    });
  });

  it("starts empty when changing to enum and drops options when changing away", () => {
    const toEnum = changeNodeType(createBuilderNode("n", "x"), "enum", () => "i");
    expect(toEnum.enumValues).toEqual([]);

    const away = changeNodeType(enumNode(), "number", () => "i");
    expect(away.enumValues).toBeUndefined();
    expect(createJsonSchema("T", [away]).properties?.status).toEqual({
      type: "number",
    });
  });

  it("restores an enum node from a saved schema", () => {
    const schema = createJsonSchema("Post", [enumNode()]);
    const [node] = propertiesFromJsonSchema(schema, sequentialId());

    expect(node).toMatchObject({
      name: "status",
      type: "enum",
      enumValues: ["draft", "published"],
    });
  });

  it("does not infer enums from sample JSON", () => {
    const properties = importProperties('{ "status": "draft" }');

    expect(findProperty(properties, "status").type).toBe("string");
  });

  it("rejects missing, blank, and duplicate options", () => {
    expect(validateSchema("T", [enumNode({ enumValues: [] })]).errors).toEqual([
      "status needs at least one option.",
    ]);
    expect(validateSchema("T", [enumNode({ enumValues: ["a", " "] })]).errors).toEqual([
      "status cannot have blank options.",
    ]);
    expect(validateSchema("T", [enumNode({ enumValues: ["a", "a "] })]).errors).toEqual([
      "status cannot have duplicate options.",
    ]);
    expect(validateSchema("T", [enumNode()]).isValid).toBe(true);
  });

  it("validates enum array items", () => {
    const array: BuilderNode = {
      id: "a",
      name: "states",
      type: "array",
      required: false,
      items: enumNode({ name: "items", enumValues: [] }),
    };

    expect(validateSchema("T", [array]).errors).toEqual([
      "states items needs at least one option.",
    ]);
  });
});
