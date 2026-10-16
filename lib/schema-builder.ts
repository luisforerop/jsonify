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

/** Pseudo-types stored as a `string` with a JSON Schema `format`. */
export const FORMAT_TYPES = ["date", "time"] as const;

export type FormatType = (typeof FORMAT_TYPES)[number];

/** Types selectable in the builder: JSON Schema types plus the `enum`, `date` and `time` pseudo-types. */
export const BUILDER_TYPES = [
  ...JSON_SCHEMA_TYPES,
  "enum",
  ...FORMAT_TYPES,
] as const;

export type BuilderNodeType = (typeof BUILDER_TYPES)[number];

export type BuilderNode = {
  id: string;
  name: string;
  type: BuilderNodeType;
  required: boolean;
  /** Stored property key. When set it wins over the key derived from `name`. */
  key?: string;
  enumValues?: string[];
  properties?: BuilderNode[];
  items?: BuilderNode;
};

export type JsonSchema = {
  $schema?: string;
  title?: string;
  type: JsonSchemaType;
  enum?: string[];
  format?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
};

export type SchemaValidation = {
  isValid: boolean;
  errors: string[];
};

/**
 * Derives a storable property key from a display label: diacritics removed,
 * lower-cased, runs of non-alphanumerics collapsed to `_`, never starting with
 * a digit.
 */
export function normalizeKey(label: string): string {
  const key = label
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return /^[0-9]/.test(key) ? `field_${key}` : key;
}

/** The key a property is stored under: its persisted key, else derived. */
export function resolveKey(node: BuilderNode): string {
  return node.key ?? normalizeKey(node.name);
}

/** The pseudo-type for a `string` schema's `format`, if it is one we support. */
export function formatTypeOf(schema: JsonSchema): FormatType | undefined {
  return schema.type === "string"
    ? FORMAT_TYPES.find((type) => type === schema.format)
    : undefined;
}

export function createBuilderNode(id: string, name = ""): BuilderNode {
  return { id, name, type: "string", required: false };
}

export function changeNodeType(
  node: BuilderNode,
  type: BuilderNodeType,
  createId: () => string,
): BuilderNode {
  if (type === "enum") {
    return {
      ...node,
      type,
      enumValues: node.enumValues ?? [],
      properties: undefined,
      items: undefined,
    };
  }

  if (type === "object") {
    return {
      ...node,
      type,
      enumValues: undefined,
      properties: node.properties ?? [],
      items: undefined,
    };
  }

  if (type === "array") {
    return {
      ...node,
      type,
      enumValues: undefined,
      properties: undefined,
      items: node.items ?? createBuilderNode(createId(), "items"),
    };
  }

  return {
    ...node,
    type,
    enumValues: undefined,
    properties: undefined,
    items: undefined,
  };
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
  if (node.type === "enum") {
    return {
      type: "string",
      enum: (node.enumValues ?? []).map((value) => value.trim()),
    };
  }

  if (node.type === "date" || node.type === "time") {
    return { type: "string", format: node.type };
  }

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
    .filter((property) => property.required && resolveKey(property))
    .map(resolveKey);

  return {
    type: "object",
    properties: Object.fromEntries(
      properties.map((property) => [
        resolveKey(property),
        { ...toJsonSchema(property), title: property.name.trim() },
      ]),
    ),
    ...(required.length > 0 ? { required } : {}),
  };
}

export function propertiesFromJsonSchema(
  schema: JsonSchema,
  createId: () => string,
): BuilderNode[] {
  return Object.entries(schema.properties ?? {}).map(([key, property]) => ({
    ...builderNodeFromJsonSchema(key, property, createId, schema.required ?? []),
    key,
  }));
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
  const labelsByKey = new Map<string, string[]>();

  properties.forEach((property, index) => {
    const name = property.name.trim();
    const key = resolveKey(property);
    const label = `${location} property ${index + 1}`;

    if (!name) {
      errors.push(`${label} needs a name.`);
    } else if (!key) {
      errors.push(`${label} needs a name with letters or digits.`);
    } else {
      labelsByKey.set(key, [...(labelsByKey.get(key) ?? []), name]);
    }

    if (property.type === "object") {
      validatePropertyLevel(property.properties ?? [], name || label, errors);
    }

    if (property.type === "enum") {
      validateEnumOptions(property, name || label, errors);
    }

    if (property.type === "array" && property.items?.type === "enum") {
      validateEnumOptions(property.items, `${name || label} items`, errors);
    }

    if (property.type === "array" && property.items?.type === "object") {
      validatePropertyLevel(
        property.items.properties ?? [],
        `${name || label} items`,
        errors,
      );
    }
  });

  labelsByKey.forEach((labels) => {
    if (labels.length > 1) {
      errors.push(
        `${location} cannot contain duplicate property names: ${labels
          .map((label) => `"${label}"`)
          .join(", ")}.`,
      );
    }
  });
}

function validateEnumOptions(
  node: BuilderNode,
  label: string,
  errors: string[],
): void {
  const options = (node.enumValues ?? []).map((value) => value.trim());

  if (options.length === 0) {
    errors.push(`${label} needs at least one option.`);
    return;
  }

  if (options.some((option) => !option)) {
    errors.push(`${label} cannot have blank options.`);
  }

  if (new Set(options).size !== options.length) {
    errors.push(`${label} cannot have duplicate options.`);
  }
}

function builderNodeFromJsonSchema(
  name: string,
  schema: JsonSchema,
  createId: () => string,
  requiredNames: string[] = [],
): BuilderNode {
  const isEnum =
    schema.type === "string" &&
    Array.isArray(schema.enum) &&
    schema.enum.every((value) => typeof value === "string");
  const formatType = isEnum ? undefined : formatTypeOf(schema);
  const type: BuilderNodeType = isEnum
    ? "enum"
    : (formatType ??
      (JSON_SCHEMA_TYPES.includes(schema.type) ? schema.type : "string"));
  const title = typeof schema.title === "string" ? schema.title.trim() : "";
  const node: BuilderNode = {
    id: createId(),
    name: title || name,
    type,
    required: requiredNames.includes(name),
  };

  if (isEnum) {
    node.enumValues = [...(schema.enum ?? [])];
  }

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
