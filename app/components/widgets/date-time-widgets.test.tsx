import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DateWidget } from "./date-widget";
import { TimeWidget } from "./time-widget";

afterEach(cleanup);

describe("DateWidget", () => {
  it("shows an existing date", () => {
    const { container } = render(
      <DateWidget value="2026-03-05" onChange={() => {}} />,
    );
    expect((container.querySelector("input") as HTMLInputElement).value).toBe(
      "2026-03-05",
    );
  });

  it("is empty without a value", () => {
    const { container } = render(
      <DateWidget value={undefined} onChange={() => {}} />,
    );
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.type).toBe("date");
    expect(input.value).toBe("");
  });

  it("emits the chosen date as text and an empty string when cleared", () => {
    const onChange = vi.fn();
    const { container } = render(<DateWidget value="" onChange={onChange} />);
    const input = container.querySelector("input") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "2026-03-05" } });
    expect(onChange).toHaveBeenLastCalledWith("2026-03-05");

    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith("");
  });
});

describe("TimeWidget", () => {
  it("shows an existing time", () => {
    const { container } = render(
      <TimeWidget value="14:30" onChange={() => {}} />,
    );
    expect((container.querySelector("input") as HTMLInputElement).value).toBe(
      "14:30",
    );
  });

  it("emits the chosen time as text and an empty string when cleared", () => {
    const onChange = vi.fn();
    const { container } = render(<TimeWidget value="" onChange={onChange} />);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.type).toBe("time");

    fireEvent.change(input, { target: { value: "14:30" } });
    expect(onChange).toHaveBeenLastCalledWith("14:30");

    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith("");
  });
});
