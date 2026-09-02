import { vi } from "vitest";

type StoredRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

/**
 * Installs a `global.fetch` stub backed by an in-memory array that mimics the
 * `/api/<collection>` route handlers (list / create / update / delete). Used by
 * the persistence-hook tests. Returns the backing array and a request log.
 */
export function installCollectionFetchStub(basePath: string) {
  const store: StoredRecord[] = [];
  const calls: { method: string; url: string; body: unknown }[] = [];
  let counter = 0;

  const stub = vi.fn(
    async (input: string | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === "string" ? input : input.toString();
      const method = (init?.method ?? "GET").toUpperCase();
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      calls.push({ method, url, body });

      if (method === "GET" && url === basePath) {
        return json(200, store);
      }

      if (method === "POST" && url === basePath) {
        const now = new Date().toISOString();
        const record: StoredRecord = {
          ...body,
          id: `id-${++counter}`,
          createdAt: now,
          updatedAt: now,
        };
        store.push(record);
        return json(201, record);
      }

      const idMatch = url.startsWith(`${basePath}/`)
        ? url.slice(basePath.length + 1)
        : null;

      if (method === "PATCH" && idMatch) {
        const existing = store.find((record) => record.id === idMatch);
        if (!existing) return json(404, { error: "Not found" });
        Object.assign(existing, body, { updatedAt: new Date().toISOString() });
        return json(200, existing);
      }

      if (method === "DELETE" && idMatch) {
        const index = store.findIndex((record) => record.id === idMatch);
        if (index === -1) return json(404, { deleted: false });
        store.splice(index, 1);
        return json(200, { deleted: true });
      }

      return json(404, { error: "Unhandled route" });
    },
  );

  vi.stubGlobal("fetch", stub);

  return { store, calls };
}

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
