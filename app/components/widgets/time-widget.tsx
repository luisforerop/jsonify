import type { WidgetProps } from "./types";

/** Time picker; the value is a 24-hour time (`HH:mm`) or `""`. */
export function TimeWidget({
  value,
  onChange,
  label,
  required,
  invalid,
  disabled,
}: WidgetProps) {
  return (
    <input
      type="time"
      aria-label={label}
      aria-required={required || undefined}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
