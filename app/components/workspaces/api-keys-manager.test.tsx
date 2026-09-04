import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiKeysManager } from "./api-keys-manager";

const workspaceId = "workspace-1";
const RAW_KEY = "jfy_abcdef0123456789abcdef0123456789";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubFetch(collections: { id: string; name: string; slug: string }[] = []) {
  const postCalls: { name: string; workspaceId: string; scopes: string[] }[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = (init?.method ?? "GET").toUpperCase();

      if (method === "GET" && url === "/api/collections") {
        return new Response(JSON.stringify(collections), { status: 200 });
      }

      if (method === "GET") {
        return new Response("[]", { status: 200 });
      }

      if (method === "POST" && url === "/api/api-keys") {
        const body = JSON.parse(init?.body as string) as {
          name: string;
          workspaceId: string;
          scopes: string[];
        };
        postCalls.push(body);
        return new Response(
          JSON.stringify({
            id: "key-1",
            name: body.name,
            workspaceId: body.workspaceId,
            keyPrefix: RAW_KEY.slice(0, 12),
            scopes: body.scopes,
            lastUsedAt: null,
            createdAt: "",
            updatedAt: "",
            key: RAW_KEY,
          }),
          { status: 201 },
        );
      }

      return new Response(JSON.stringify({ error: "Unhandled" }), {
        status: 404,
      });
    }),
  );

  return { postCalls };
}

describe("ApiKeysManager", () => {
  it("shows the raw secret once after creation, then hides it after Done", async () => {
    stubFetch();
    render(<ApiKeysManager workspaceId={workspaceId} />);

    await waitFor(() => expect(screen.getByText("No API keys yet.")).toBeTruthy());

    fireEvent.change(screen.getByPlaceholderText("Integration"), {
      target: { value: "My integration" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Read" }));
    fireEvent.click(screen.getByRole("button", { name: "Create key" }));

    await waitFor(() => expect(screen.getByText(RAW_KEY)).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(screen.queryByText(RAW_KEY)).toBeNull();
  });

  it("builds scopes from the chosen collection and action, not free text", async () => {
    const { postCalls } = stubFetch([
      { id: "c1", name: "Recetas", slug: "recetas" },
    ]);
    render(<ApiKeysManager workspaceId={workspaceId} />);

    await waitFor(() =>
      expect(screen.getByText("Recetas")).toBeTruthy(),
    );

    fireEvent.change(screen.getByPlaceholderText("Integration"), {
      target: { value: "Recetas writer" },
    });

    const recetasRow = screen.getByText("Recetas").closest(".scope-row");
    if (!(recetasRow instanceof HTMLElement)) {
      throw new Error("Recetas row not found");
    }
    fireEvent.click(
      within(recetasRow).getByRole("checkbox", {
        name: "Write (create & update)",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Create key" }));

    await waitFor(() => expect(postCalls).toHaveLength(1));
    expect(postCalls[0]?.scopes).toEqual(["write:recetas"]);

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(() =>
      expect(screen.getByText("Recetas: Write")).toBeTruthy(),
    );
  });
});
