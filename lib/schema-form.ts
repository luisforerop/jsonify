import {
  JSON_SCHEMA_TYPES,
  type JsonSchema,
  type JsonSchemaType,
} from "./schema-builder";

export type FormField = {
  name: string;
  type: JsonSchemaType;
  required: boolean;
  properties?: FormField[];
  items?: FormField;
};

export type FormValues = { [key: string]: FormValue };

export type FormValue =
  | string
  | number
  | boolean
  | null
  | FormValues
  | FormValue[];

export type FormPathSegment = string | number;

export type FormValidation = {
  isValid: boolean;
  missingFields: string[];
};

export function deriveFormFields(schema: JsonSchema): FormField[] {
  return Object.entries(schema.properties ?? {}).map(([name, property]) =>
    formFieldFromJsonSchema(name, property, schema.required ?? []),
  );
}

function formFieldFromJsonSchema(
  name: string,
  schema: JsonSchema,
  requiredNames: string[],
): FormField {
  const type = JSON_SCHEMA_TYPES.includes(schema.type) ? schema.type : "string";
  const field: FormField = {
    name,
    type,
    required: requiredNames.includes(name),
  };

  if (type === "object") {
    field.properties = deriveFormFields(schema);
  }

  if (type === "array") {
    field.items = formFieldFromJsonSchema(
      "items",
      schema.items ?? { type: "string" },
      [],
    );
  }

  return field;
}

export function createInitialValues(fields: FormField[]): FormValues {
  return Object.fromEntries(
    fields.map((field) => [field.name, createInitialValue(field)]),
  );
}

export function createInitialValue(field: FormField): FormValue {
  if (field.type === "object") {
    return createInitialValues(field.properties ?? []);
  }

  if (field.type === "array") {
    return [];
  }

  if (field.type === "boolean") {
    return false;
  }

  if (field.type === "null") {
    return null;
  }

  return "";
}

export function validateFormValues(
  fields: FormField[],
  values: FormValues,
): FormValidation {
  const missingFields: string[] = [];
  collectMissingFields(fields, values, "", missingFields);
  return { isValid: missingFields.length === 0, missingFields };
}

function collectMissingFields(
  fields: FormField[],
  values: FormValues,
  path: string,
  missingFields: string[],
): void {
  fields.forEach((field) => {
    const fieldPath = path ? `${path}.${field.name}` : field.name;
    const value = values[field.name];

    if (field.required && isEmptyValue(field, value)) {
      missingFields.push(fieldPath);
      return;
    }

    if (field.type === "object" && field.properties) {
      collectMissingFields(
        field.properties,
        (value as FormValues) ?? {},
        fieldPath,
        missingFields,
      );
    }
  });
}

function isEmptyValue(field: FormField, value: FormValue | undefined): boolean {
  if (field.type === "object") {
    return !value || Object.keys(value as FormValues).length === 0;
  }

  if (field.type === "array") {
    return !Array.isArray(value) || value.length === 0;
  }

  if (field.type === "boolean" || field.type === "null") {
    return false;
  }

  return value === undefined || value === null || value === "";
}

export type FormValuesImportResult =
  | { ok: true; values: FormValues }
  | { ok: false; error: string };

export function formValuesFromJson(
  input: string,
  fields: FormField[],
): FormValuesImportResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch {
    return { ok: false, error: "Enter valid JSON to fill the form." };
  }

  if (!isPlainObject(parsed)) {
    return {
      ok: false,
      error: 'Paste a JSON object, for example { "name": "value" }.',
    };
  }

  return { ok: true, values: conformValues(fields, parsed) };
}

function conformValues(
  fields: FormField[],
  raw: Record<string, unknown>,
): FormValues {
  return Object.fromEntries(
    fields.map((field) => [field.name, conformValue(field, raw[field.name])]),
  );
}

function conformValue(field: FormField, raw: unknown): FormValue {
  if (field.type === "null") {
    return null;
  }

  if (raw === undefined || raw === null) {
    return createInitialValue(field);
  }

  if (field.type === "object") {
    return isPlainObject(raw)
      ? conformValues(field.properties ?? [], raw)
      : createInitialValues(field.properties ?? []);
  }

  if (field.type === "array") {
    if (!Array.isArray(raw) || !field.items) {
      return [];
    }
    const itemField = field.items;
    return raw.map((element) => conformValue(itemField, element));
  }

  if (field.type === "boolean") {
    return typeof raw === "boolean" ? raw : false;
  }

  if (field.type === "number" || field.type === "integer") {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
    if (
      typeof raw === "string" &&
      raw.trim() !== "" &&
      Number.isFinite(Number(raw))
    ) {
      return Number(raw);
    }
    return "";
  }

  if (typeof raw === "string") {
    return raw;
  }

  if (typeof raw === "number" || typeof raw === "boolean") {
    return String(raw);
  }

  return "";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function getValueAtPath(
  values: FormValues,
  path: FormPathSegment[],
): FormValue | undefined {
  let current: FormValue | undefined = values;

  for (const key of path) {
    if (current === undefined || current === null) {
      return undefined;
    }

    current =
      typeof key === "number"
        ? Array.isArray(current)
          ? current[key]
          : undefined
        : typeof current === "object" && !Array.isArray(current)
          ? (current as FormValues)[key]
          : undefined;
  }

  return current;
}

export function setValueAtPath(
  values: FormValues,
  path: FormPathSegment[],
  newValue: FormValue,
): FormValues {
  return updateContainer(values, path, newValue) as FormValues;
}

function updateContainer(
  container: FormValue | undefined,
  path: FormPathSegment[],
  newValue: FormValue,
): FormValue {
  const [key, ...rest] = path;

  if (key === undefined) {
    return newValue;
  }

  if (typeof key === "number") {
    const array = Array.isArray(container) ? [...container] : [];
    array[key] =
      rest.length === 0
        ? newValue
        : updateContainer(array[key], rest, newValue);
    return array;
  }

  const record =
    container && typeof container === "object" && !Array.isArray(container)
      ? { ...(container as FormValues) }
      : {};
  record[key] =
    rest.length === 0 ? newValue : updateContainer(record[key], rest, newValue);
  return record;
}

export function addArrayItem(
  values: FormValues,
  path: FormPathSegment[],
  defaultValue: FormValue,
): FormValues {
  const current = getValueAtPath(values, path);
  const array = Array.isArray(current) ? current : [];
  return setValueAtPath(values, path, [...array, defaultValue]);
}

export function removeArrayItem(
  values: FormValues,
  path: FormPathSegment[],
  index: number,
): FormValues {
  const current = getValueAtPath(values, path);
  const array = Array.isArray(current) ? current : [];
  return setValueAtPath(
    values,
    path,
    array.filter((_, itemIndex) => itemIndex !== index),
  );
}
