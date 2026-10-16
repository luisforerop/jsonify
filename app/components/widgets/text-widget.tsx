import type { WidgetProps } from "./types";

export function TextWidget({
  value,
  onChange,
  label,
  required,
  invalid,
  disabled,
}: WidgetProps) {
  return (
    <input
      type="text"
      aria-label={label}
      aria-required={required || undefined}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
