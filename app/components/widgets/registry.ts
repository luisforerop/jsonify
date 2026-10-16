import { BooleanWidget } from "./boolean-widget";
import { DateWidget } from "./date-widget";
import { EnumWidget } from "./enum-widget";
import { NullWidget } from "./null-widget";
import { IntegerWidget, NumberWidget } from "./number-widget";
import { TextWidget } from "./text-widget";
import { TimeWidget } from "./time-widget";
import type { Widget, WidgetType } from "./types";

/**
 * Maps each field kind to the component that edits it. To use another input
 * library, point an entry at a component that honours `WidgetProps`.
 */
export const WIDGETS: Record<WidgetType, Widget> = {
  string: TextWidget,
  number: NumberWidget,
  integer: IntegerWidget,
  boolean: BooleanWidget,
  null: NullWidget,
  enum: EnumWidget,
  date: DateWidget,
  time: TimeWidget,
};

/** The widget registered for `type`; unknown kinds fall back to text. */
export function resolveWidget(type: string): Widget {
  return Object.hasOwn(WIDGETS, type) ? WIDGETS[type as WidgetType] : TextWidget;
}
