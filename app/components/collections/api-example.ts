export type ApiExampleAction = "read" | "write" | "delete";

export type ApiExampleRequest = {
  method: "GET" | "POST" | "DELETE";
  path: string;
  needsSchemaHeader: boolean;
  needsBody: boolean;
};

/** The concrete `/api/v1` request a given action makes against one collection. */
export function requestForAction(
  action: ApiExampleAction,
  collectionSlug: string,
): ApiExampleRequest {
  if (action === "read") {
    return {
      method: "GET",
      path: `/api/v1/collections/${collectionSlug}/records`,
      needsSchemaHeader: false,
      needsBody: false,
    };
  }
  if (action === "write") {
    return {
      method: "POST",
      path: `/api/v1/collections/${collectionSlug}/records`,
      needsSchemaHeader: true,
      needsBody: true,
    };
  }
  return {
    method: "DELETE",
    path: `/api/v1/collections/${collectionSlug}/records/<record-id>`,
    needsSchemaHeader: false,
    needsBody: false,
  };
}

type ExampleParams = {
  origin: string;
  workspaceId: string;
  apiKey: string;
  request: ApiExampleRequest;
};

function exampleHeaders({
  workspaceId,
  apiKey,
  request,
}: ExampleParams): Record<string, string> {
  const headers: Record<string, string> = {
    "x-workspace-id": workspaceId,
    Authorization: `Bearer ${apiKey}`,
  };
  if (request.needsSchemaHeader) headers["x-schema"] = "<schema-name>";
  if (request.needsBody) headers["Content-Type"] = "application/json";
  return headers;
}

export function buildCurlExample(params: ExampleParams): string {
  const { origin, request } = params;
  const headers = exampleHeaders(params);
  const methodFlag = request.method === "GET" ? "" : ` -X ${request.method}`;

  const lines = [
    `curl -s${methodFlag} ${origin}${request.path}`,
    ...Object.entries(headers).map(([key, value]) => `  -H "${key}: ${value}"`),
  ];
  if (request.needsBody) lines.push(`  -d '{"field":"value"}'`);

  return lines.map((line, index) => (index < lines.length - 1 ? `${line} \\` : line)).join("\n");
}

export function buildFetchExample(params: ExampleParams): string {
  const { origin, request } = params;
  const headers = exampleHeaders(params);
  const headerLines = Object.entries(headers)
    .map(([key, value]) => `    "${key}": "${value}",`)
    .join("\n");

  const lines = [
    `fetch("${origin}${request.path}", {`,
    `  method: "${request.method}",`,
    `  headers: {`,
    headerLines,
    `  },`,
  ];
  if (request.needsBody) {
    lines.push(`  body: JSON.stringify({ field: "value" }),`);
  }
  lines.push(`});`);

  return lines.join("\n");
}
