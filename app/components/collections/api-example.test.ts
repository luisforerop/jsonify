import { describe, expect, it } from "vitest";

import {
  buildCurlExample,
  buildFetchExample,
  requestForAction,
} from "./api-example";

describe("requestForAction", () => {
  it("builds a GET with no schema header or body for read", () => {
    expect(requestForAction("read", "recetas")).toEqual({
      method: "GET",
      path: "/api/v1/collections/recetas/records",
      needsSchemaHeader: false,
      needsBody: false,
    });
  });

  it("builds a POST needing a schema header and a body for write", () => {
    expect(requestForAction("write", "recetas")).toEqual({
      method: "POST",
      path: "/api/v1/collections/recetas/records",
      needsSchemaHeader: true,
      needsBody: true,
    });
  });

  it("builds a DELETE against a record id for delete", () => {
    expect(requestForAction("delete", "recetas")).toEqual({
      method: "DELETE",
      path: "/api/v1/collections/recetas/records/<record-id>",
      needsSchemaHeader: false,
      needsBody: false,
    });
  });
});

describe("buildCurlExample", () => {
  it("includes the workspace and auth headers, and omits -X for GET", () => {
    const curl = buildCurlExample({
      origin: "http://localhost:3000",
      workspaceId: "ws-1",
      apiKey: "<api-key>",
      request: requestForAction("read", "recetas"),
    });
    expect(curl).toContain("curl -s http://localhost:3000/api/v1/collections/recetas/records");
    expect(curl).not.toContain(" -X ");
    expect(curl).toContain('-H "x-workspace-id: ws-1"');
    expect(curl).toContain('-H "Authorization: Bearer <api-key>"');
  });

  it("adds the schema header and a JSON body for a write example", () => {
    const curl = buildCurlExample({
      origin: "http://localhost:3000",
      workspaceId: "ws-1",
      apiKey: "<api-key>",
      request: requestForAction("write", "recetas"),
    });
    expect(curl).toContain("-X POST");
    expect(curl).toContain('-H "x-schema: <schema-name>"');
    expect(curl).toContain("-d '{\"field\":\"value\"}'");
  });
});

describe("buildFetchExample", () => {
  it("produces a fetch call with matching headers", () => {
    const snippet = buildFetchExample({
      origin: "http://localhost:3000",
      workspaceId: "ws-1",
      apiKey: "<api-key>",
      request: requestForAction("delete", "recetas"),
    });
    expect(snippet).toContain(
      'fetch("http://localhost:3000/api/v1/collections/recetas/records/<record-id>"',
    );
    expect(snippet).toContain('method: "DELETE"');
    expect(snippet).toContain('"Authorization": "Bearer <api-key>"');
    expect(snippet).not.toContain("body:");
  });
});
