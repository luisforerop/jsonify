import type { WidgetProps } from "./types";

/** Date picker; the value is an ISO 8601 date (`YYYY-MM-DD`) or `""`. */
export function DateWidget({
  value,
  onChange,
  label,
  required,
  invalid,
  disabled,
}: WidgetProps) {
  return (
    <input
      type="date"
      aria-label={label}
      aria-required={required || undefined}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
