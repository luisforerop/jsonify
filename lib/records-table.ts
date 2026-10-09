import type { JsonSchema } from "@/lib/schema-builder";

const PREVIEW_ITEMS = 3;
const PREVIEW_PAIRS = 2;

export type CellDescription =
  | { kind: "missing" }
  | { kind: "null" }
  | { kind: "text"; text: string }
  | { kind: "empty"; container: "array" | "object" }
  | { kind: "list"; count: number; preview: string[]; more: number }
  | { kind: "items"; count: number }
  | {
      kind: "object";
      count: number;
      preview: { key: string; value: string }[];
      more: number;
    };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPrimitive(value: unknown): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/** Short one-line text for a value shown inside a preview. */
function previewText(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "[…]";
  if (isPlainObject(value)) return "{…}";
  return String(value);
}

/** Classifies a payload value for rendering in a table cell. */
export function describeCell(value: unknown): CellDescription {
  if (value === undefined) return { kind: "missing" };
  if (value === null) return { kind: "null" };
  if (isPrimitive(value)) return { kind: "text", text: String(value) };

  if (Array.isArray(value)) {
    if (value.length === 0) return { kind: "empty", container: "array" };
    if (value.every(isPrimitive)) {
      return {
        kind: "list",
        count: value.length,
        preview: value.slice(0, PREVIEW_ITEMS).map(String),
        more: Math.max(0, value.length - PREVIEW_ITEMS),
      };
    }
    return { kind: "items", count: value.length };
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) return { kind: "empty", container: "object" };
    return {
      kind: "object",
      count: keys.length,
      preview: keys.slice(0, PREVIEW_PAIRS).map((key) => ({
        key,
        value: previewText(value[key]),
      })),
      more: Math.max(0, keys.length - PREVIEW_PAIRS),
    };
  }

  return { kind: "text", text: String(value) };
}

/**
 * Column keys for the table. With a schema: its top-level properties in schema
 * order. Without one: the union of top-level payload keys, first-seen order.
 */
export function deriveColumns(
  schema: JsonSchema | null,
  payloads: Record<string, unknown>[],
): string[] {
  if (schema) return Object.keys(schema.properties ?? {});
  const seen = new Set<string>();
  for (const payload of payloads) {
    for (const key of Object.keys(payload)) seen.add(key);
  }
  return [...seen];
}
