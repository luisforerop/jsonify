import type { WidgetProps } from "./types";

export function EnumWidget({
  value,
  onChange,
  options = [],
  label,
  required,
  invalid,
  disabled,
}: WidgetProps) {
  const selected = typeof value === "string" ? value : "";

  return (
    <select
      aria-label={label}
      aria-required={required || undefined}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      value={options.includes(selected) ? selected : ""}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value=""></option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
