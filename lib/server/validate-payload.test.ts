import { describe, expect, it } from "vitest";

import type { JsonSchema } from "@/lib/schema-builder";
import { validatePayload, type StoredSchema } from "@/lib/server/validate-payload";

function storedSchema(schema: JsonSchema, overrides: Partial<StoredSchema> = {}): StoredSchema {
  return {
    id: "schema-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    name: "Receta",
    collectionId: "c1",
    workspaceId: "w1",
    schema,
    ...overrides,
  };
}

const recetaSchema: JsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Receta",
  type: "object",
  properties: {
    nombre: { type: "string" },
    porciones: { type: "integer" },
    ingredientes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string" },
          cantidad: { type: "number" },
        },
        required: ["nombre"],
      },
    },
    origen: {
      type: "object",
      properties: { pais: { type: "string" } },
      required: ["pais"],
    },
  },
  required: ["nombre", "porciones"],
};

describe("validatePayload", () => {
  it("accepts a conforming object", () => {
    const result = validatePayload(storedSchema(recetaSchema), {
      nombre: "Arepa",
      porciones: 4,
      ingredientes: [{ nombre: "Maíz", cantidad: 2 }],
      origen: { pais: "Colombia" },
    });
    expect(result).toEqual({ valid: true });
  });

  it("reports a wrong scalar type", () => {
    const result = validatePayload(storedSchema(recetaSchema), {
      nombre: 123,
      porciones: 4,
    });
    expect(result).toMatchObject({ valid: false, reason: "invalid" });
    expect((result as { details: string[] }).details.join("\n")).toContain("/nombre");
  });

  it("reports a missing required property", () => {
    const result = validatePayload(storedSchema(recetaSchema), { nombre: "Arepa" });
    expect(result).toMatchObject({ valid: false, reason: "invalid" });
    expect((result as { details: string[] }).details.join("\n")).toContain("porciones");
  });

  it("reports a non-integer for an integer property", () => {
    const result = validatePayload(storedSchema(recetaSchema), {
      nombre: "Arepa",
      porciones: 4.5,
    });
    expect(result).toMatchObject({ valid: false, reason: "invalid" });
    expect((result as { details: string[] }).details.join("\n")).toContain("integer");
  });

  it("reports a non-array for an array property", () => {
    const result = validatePayload(storedSchema(recetaSchema), {
      nombre: "Arepa",
      porciones: 4,
      ingredientes: "Maíz",
    });
    expect(result).toMatchObject({ valid: false, reason: "invalid" });
    expect((result as { details: string[] }).details.join("\n")).toContain("/ingredientes");
  });

  it("reports a violation inside an array item", () => {
    const result = validatePayload(storedSchema(recetaSchema), {
      nombre: "Arepa",
      porciones: 4,
      ingredientes: [{ cantidad: "mucho" }],
    });
    expect(result).toMatchObject({ valid: false, reason: "invalid" });
    expect((result as { details: string[] }).details.join("\n")).toContain(
      "/ingredientes/0",
    );
  });

  it("reports every violation at once", () => {
    const result = validatePayload(storedSchema(recetaSchema), {
      nombre: 1,
      porciones: "four",
    });
    expect(result).toMatchObject({ valid: false, reason: "invalid" });
    expect((result as { details: string[] }).details.length).toBeGreaterThanOrEqual(2);
  });

  it("accepts additional properties the schema does not declare", () => {
    const result = validatePayload(storedSchema(recetaSchema), {
      nombre: "Arepa",
      porciones: 4,
      notas: "extra field",
    });
    expect(result).toEqual({ valid: true });
  });

  it("flags a stored schema that cannot be compiled", () => {
    const result = validatePayload(
      storedSchema({ type: "not-a-real-type" } as unknown as JsonSchema),
      { anything: true },
    );
    expect(result).toMatchObject({ valid: false, reason: "uncompilable-schema" });
  });
});
