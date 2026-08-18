"use client";

import type {
  FormField,
  FormPathSegment,
  FormValue,
  FormValues,
} from "@/lib/schema-form";
import { createInitialValue } from "@/lib/schema-form";

type FieldGroupProps = {
  fields: FormField[];
  values: FormValues;
  path: FormPathSegment[];
  missingFields: string[];
  onChange: (path: FormPathSegment[], value: FormValue) => void;
  onAddItem: (path: FormPathSegment[], defaultValue: FormValue) => void;
  onRemoveItem: (path: FormPathSegment[], index: number) => void;
};

export function FieldGroup({
  fields,
  values,
  path,
  ...handlers
}: FieldGroupProps) {
  return (
    <div className="field-group">
      {fields.map((field) => (
        <FieldEditor
          key={field.name}
          field={field}
          value={values[field.name]}
          path={[...path, field.name]}
          {...handlers}
        />
      ))}
    </div>
  );
}

type FieldEditorProps = Omit<FieldGroupProps, "fields" | "values"> & {
  field: FormField;
  value: FormValue | undefined;
};

function FieldEditor({
  field,
  value,
  path,
  missingFields,
  onChange,
  onAddItem,
  onRemoveItem,
}: FieldEditorProps) {
  const fieldPath = path.join(".");
  const isMissing = missingFields.includes(fieldPath);

  if (field.type === "object") {
    return (
      <fieldset className="field-object">
        <legend>
          {field.name}
          {field.required && <span className="required-mark">*</span>}
        </legend>
        <FieldGroup
          fields={field.properties ?? []}
          values={(value as FormValues) ?? {}}
          path={path}
          missingFields={missingFields}
          onChange={onChange}
          onAddItem={onAddItem}
          onRemoveItem={onRemoveItem}
        />
      </fieldset>
    );
  }

  if (field.type === "array") {
    const items = Array.isArray(value) ? value : [];
    const itemField = field.items;

    return (
      <fieldset className="field-array">
        <legend>
          {field.name}
          {field.required && <span className="required-mark">*</span>}
        </legend>
        <ArrayItems
          items={items}
          itemField={itemField}
          path={path}
          missingFields={missingFields}
          onChange={onChange}
          onAddItem={onAddItem}
          onRemoveItem={onRemoveItem}
        />
      </fieldset>
    );
  }

  return (
    <label className={isMissing ? "field-scalar is-missing" : "field-scalar"}>
      <span>
        {field.name}
        {field.required && <span className="required-mark">*</span>}
      </span>
      <ScalarInput
        type={field.type}
        value={value}
        onChange={(next) => onChange(path, next)}
      />
    </label>
  );
}

type ArrayItemsProps = {
  items: FormValue[];
  itemField: FormField | undefined;
  path: FormPathSegment[];
  missingFields: string[];
  onChange: (path: FormPathSegment[], value: FormValue) => void;
  onAddItem: (path: FormPathSegment[], defaultValue: FormValue) => void;
  onRemoveItem: (path: FormPathSegment[], index: number) => void;
};

// Array items are keyed by position: this app never reorders items, only
// appends or removes, so index-based keys stay stable across those edits.
function ArrayItems({
  items,
  itemField,
  path,
  missingFields,
  onChange,
  onAddItem,
  onRemoveItem,
}: ArrayItemsProps) {
  return (
    <>
      <div className="array-items">
        {items.map((itemValue, index) => {
          const itemPath = [...path, index];

          return (
            <div className="array-item-row" key={index}>
              {itemField && itemField.type === "object" ? (
                <FieldGroup
                  fields={itemField.properties ?? []}
                  values={(itemValue as FormValues) ?? {}}
                  path={itemPath}
                  missingFields={missingFields}
                  onChange={onChange}
                  onAddItem={onAddItem}
                  onRemoveItem={onRemoveItem}
                />
              ) : (
                <ScalarInput
                  type={itemField?.type ?? "string"}
                  value={itemValue}
                  onChange={(next) => onChange(itemPath, next)}
                />
              )}
              <button
                className="remove-property-button"
                type="button"
                onClick={() => onRemoveItem(path, index)}
                aria-label={`Remove item ${index + 1}`}
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>
      <button
        className="text-button"
        type="button"
        onClick={() =>
          onAddItem(path, itemField ? createInitialValue(itemField) : "")
        }
      >
        Add item
      </button>
    </>
  );
}

function ScalarInput({
  type,
  value,
  onChange,
}: {
  type: FormField["type"];
  value: FormValue | undefined;
  onChange: (value: FormValue) => void;
}) {
  if (type === "boolean") {
    return (
      <input
        checked={Boolean(value)}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
    );
  }

  if (type === "null") {
    return <input disabled type="text" value="null" />;
  }

  if (type === "number" || type === "integer") {
    return (
      <input
        step={type === "integer" ? 1 : "any"}
        type="number"
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(event) =>
          onChange(event.target.value === "" ? "" : Number(event.target.value))
        }
      />
    );
  }

  return (
    <input
      type="text"
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
