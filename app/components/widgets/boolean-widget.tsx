import type { WidgetProps } from "./types";

export function BooleanWidget({
  value,
  onChange,
  label,
  invalid,
  disabled,
}: WidgetProps) {
  return (
    <input
      checked={Boolean(value)}
      type="checkbox"
      aria-label={label}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
    />
  );
}
