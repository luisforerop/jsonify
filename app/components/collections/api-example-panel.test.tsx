import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiExamplePanel } from "./api-example-panel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ApiExamplePanel", () => {
  it("defaults to a read curl example for the given collection", () => {
    const { container } = render(
      <ApiExamplePanel workspaceId="ws-1" collectionSlug="recetas" />,
    );
    const snippet = container.querySelector(".api-example-snippet");
    expect(snippet?.textContent).toContain("curl -s");
    expect(snippet?.textContent).toContain(
      "/api/v1/collections/recetas/records",
    );
    expect(snippet?.textContent).toContain("Bearer <api-key>");
  });

  it("switches to a write example with a schema header and body when Write is picked", () => {
    const { container } = render(
      <ApiExamplePanel workspaceId="ws-1" collectionSlug="recetas" />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Write (create & update)" }),
    );
    const snippet = container.querySelector(".api-example-snippet");
    expect(snippet?.textContent).toContain("-X POST");
    expect(snippet?.textContent).toContain("x-schema");
  });

  it("switches to a delete example targeting a record id when Delete is picked", () => {
    const { container } = render(
      <ApiExamplePanel workspaceId="ws-1" collectionSlug="recetas" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const snippet = container.querySelector(".api-example-snippet");
    expect(snippet?.textContent).toContain("-X DELETE");
    expect(snippet?.textContent).toContain("records/<record-id>");
  });

  it("switches between curl and fetch formats", () => {
    const { container } = render(
      <ApiExamplePanel workspaceId="ws-1" collectionSlug="recetas" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "fetch" }));
    const snippet = container.querySelector(".api-example-snippet");
    expect(snippet?.textContent).toContain("fetch(");
    expect(snippet?.textContent).toContain('method: "GET"');
  });

  it("copies the current snippet to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<ApiExamplePanel workspaceId="ws-1" collectionSlug="recetas" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy curl example" }));

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/collections/recetas/records"),
    );
  });
});
