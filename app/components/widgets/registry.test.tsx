import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { resolveWidget, WIDGETS } from "./registry";
import { TextWidget } from "./text-widget";
import type { WidgetProps } from "./types";

afterEach(cleanup);

describe("widget registry", () => {
  it("resolves the registered widget for each type", () => {
    for (const [type, widget] of Object.entries(WIDGETS)) {
      expect(resolveWidget(type)).toBe(widget);
    }
    expect(resolveWidget("date")).not.toBe(resolveWidget("time"));
  });

  it("falls back to the text widget for an unknown type", () => {
    expect(resolveWidget("unknown")).toBe(TextWidget);
    expect(resolveWidget("toString")).toBe(TextWidget);
  });

  it("lets a registered widget be replaced by one honouring the contract", () => {
    const original = WIDGETS.date;
    const Custom = ({ value }: WidgetProps) => (
      <span data-testid="custom">{String(value)}</span>
    );

    try {
      WIDGETS.date = Custom;
      const Widget = resolveWidget("date");
      const { getByTestId } = render(
        <Widget value="2026-03-05" onChange={() => {}} />,
      );
      expect(getByTestId("custom").textContent).toBe("2026-03-05");
    } finally {
      WIDGETS.date = original;
    }
  });
});
