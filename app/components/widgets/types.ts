import type { ComponentType } from "react";

/** Field kinds that have an input widget. */
export type WidgetType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "null"
  | "enum"
  | "date"
  | "time";

export type WidgetValue = string | number | boolean | null;

/**
 * The only contract between the form and an input widget: a value in, changes
 * out. Widgets never read or write form state on their own, so any component
 * honouring this contract can be swapped in through the registry.
 */
export type WidgetProps = {
  value: WidgetValue | undefined;
  onChange: (value: WidgetValue) => void;
  /** Accessible name, for widgets rendered without a wrapping `<label>`. */
  label?: string;
  /** Allowed choices, for `enum` widgets. */
  options?: string[];
  required?: boolean;
  invalid?: boolean;
  disabled?: boolean;
};

export type Widget = ComponentType<WidgetProps>;
