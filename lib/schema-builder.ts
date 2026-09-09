export const JSON_SCHEMA_TYPES = [
  "string",
  "number",
  "integer",
  "boolean",
  "null",
  "object",
  "array",
] as const;

export type JsonSchemaType = (typeof JSON_SCHEMA_TYPES)[number];

export type BuilderNode = {
  id: string;
  name: string;
  type: JsonSchemaType;
  required: boolean;
  properties?: BuilderNode[];
  items?: BuilderNode;
};

export type JsonSchema = {
  $schema?: string;
  title?: string;
  type: JsonSchemaType;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
};

export type SchemaValidation = {
  isValid: boolean;
  errors: string[];
};

export function createBuilderNode(id: string, name = ""): BuilderNode {
  return { id, name, type: "string", required: false };
}

export function changeNodeType(
  node: BuilderNode,
  type: JsonSchemaType,
  createId: () => string,
): BuilderNode {
  if (type === "object") {
    return {
      ...node,
      type,
      properties: node.properties ?? [],
      items: undefined,
    };
  }

  if (type === "array") {
    return {
      ...node,
      type,
      properties: undefined,
      items: node.items ?? createBuilderNode(createId(), "items"),
    };
  }

  return { ...node, type, properties: undefined, items: undefined };
}

export function updateNode(
  nodes: BuilderNode[],
  nodeId: string,
  update: (node: BuilderNode) => BuilderNode,
): BuilderNode[] {
  return nodes.map((node) => {
    const updatedNode = node.id === nodeId ? update(node) : node;
    const properties = updatedNode.properties
      ? updateNode(updatedNode.properties, nodeId, update)
      : undefined;
    const items = updatedNode.items
      ? updateNode([updatedNode.items], nodeId, update)[0]
      : undefined;

    return { ...updatedNode, properties, items };
  });
}

export function removeNode(
  nodes: BuilderNode[],
  nodeId: string,
): BuilderNode[] {
  return nodes
    .filter((node) => node.id !== nodeId)
    .map((node) => ({
      ...node,
      properties: node.properties
        ? removeNode(node.properties, nodeId)
        : undefined,
      items: node.items ? removeNode([node.items], nodeId)[0] : undefined,
    }));
}

export function toJsonSchema(node: BuilderNode): JsonSchema {
  if (node.type === "object") {
    return createObjectSchema(node.properties ?? []);
  }

  if (node.type === "array") {
    return {
      type: "array",
      items: toJsonSchema(
        node.items ?? createBuilderNode("default-item", "items"),
      ),
    };
  }

  return { type: node.type };
}

export function createJsonSchema(
  title: string,
  properties: BuilderNode[],
): JsonSchema {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: title.trim(),
    ...createObjectSchema(properties),
  };
}

function createObjectSchema(properties: BuilderNode[]): JsonSchema {
  const required = properties
    .filter((property) => property.required && property.name.trim())
    .map((property) => property.name.trim());

  return {
    type: "object",
    properties: Object.fromEntries(
      properties.map((property) => [
        property.name.trim(),
        toJsonSchema(property),
      ]),
    ),
    ...(required.length > 0 ? { required } : {}),
  };
}

export function propertiesFromJsonSchema(
  schema: JsonSchema,
  createId: () => string,
): BuilderNode[] {
  return Object.entries(schema.properties ?? {}).map(([name, property]) =>
    builderNodeFromJsonSchema(name, property, createId, schema.required ?? []),
  );
}

export type JsonImportResult =
  | { ok: true; properties: BuilderNode[] }
  | { ok: false; error: string };

export function schemaFromSampleJson(
  input: string,
  createId: () => string,
): JsonImportResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch {
    return { ok: false, error: "Enter valid JSON to generate a schema." };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      error: 'Paste a JSON object, for example { "name": "value" }.',
    };
  }

  const schema = inferJsonSchema(parsed);
  return { ok: true, properties: propertiesFromJsonSchema(schema, createId) };
}

function inferJsonSchema(value: unknown): JsonSchema {
  if (value === null) {
    return { type: "null" };
  }

  if (Array.isArray(value)) {
    return {
      type: "array",
      items: value.length > 0 ? inferJsonSchema(value[0]) : { type: "string" },
    };
  }

  if (typeof value === "object") {
    return {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, member]) => [
          key,
          inferJsonSchema(member),
        ]),
      ),
    };
  }

  if (typeof value === "number") {
    return { type: Number.isInteger(value) ? "integer" : "number" };
  }

  if (typeof value === "boolean") {
    return { type: "boolean" };
  }

  return { type: "string" };
}

export function validateSchema(
  title: string,
  properties: BuilderNode[],
): SchemaValidation {
  const errors: string[] = [];

  if (!title.trim()) {
    errors.push("Enter a name for this schema.");
  }

  validatePropertyLevel(properties, "Root", errors);

  return { isValid: errors.length === 0, errors };
}

function validatePropertyLevel(
  properties: BuilderNode[],
  location: string,
  errors: string[],
): void {
  const names = new Set<string>();

  properties.forEach((property, index) => {
    const name = property.name.trim();
    const label = `${location} property ${index + 1}`;

    if (!name) {
      errors.push(`${label} needs a name.`);
    } else if (names.has(name)) {
      errors.push(`${location} cannot contain duplicate property names.`);
    } else {
      names.add(name);
    }

    if (property.type === "object") {
      validatePropertyLevel(property.properties ?? [], name || label, errors);
    }

    if (property.type === "array" && property.items?.type === "object") {
      validatePropertyLevel(
        property.items.properties ?? [],
        `${name || label} items`,
        errors,
      );
    }
  });
}

function builderNodeFromJsonSchema(
  name: string,
  schema: JsonSchema,
  createId: () => string,
  requiredNames: string[] = [],
): BuilderNode {
  const type = JSON_SCHEMA_TYPES.includes(schema.type) ? schema.type : "string";
  const node: BuilderNode = {
    id: createId(),
    name,
    type,
    required: requiredNames.includes(name),
  };

  if (type === "object") {
    node.properties = propertiesFromJsonSchema(schema, createId);
  }

  if (type === "array") {
    node.items = builderNodeFromJsonSchema(
      "items",
      schema.items ?? { type: "string" },
      createId,
    );
  }

  return node;
}
