import type { WidgetProps } from "./types";

function NumberInput({
  step,
  value,
  onChange,
  label,
  required,
  invalid,
  disabled,
}: WidgetProps & { step: number | "any" }) {
  return (
    <input
      step={step}
      type="number"
      aria-label={label}
      aria-required={required || undefined}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(event) =>
        onChange(event.target.value === "" ? "" : Number(event.target.value))
      }
    />
  );
}

export function NumberWidget(props: WidgetProps) {
  return <NumberInput {...props} step="any" />;
}

export function IntegerWidget(props: WidgetProps) {
  return <NumberInput {...props} step={1} />;
}
