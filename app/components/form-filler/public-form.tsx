"use client";

import { useState } from "react";

import type { JsonSchema } from "@/lib/schema-builder";
import {
  addArrayItem,
  createInitialValues,
  deriveFormFields,
  removeArrayItem,
  setValueAtPath,
  validateFormValues,
  type FormPathSegment,
  type FormValue,
  type FormValues,
} from "@/lib/schema-form";

import { FieldGroup } from "./field-editor";

type PublicFormProps = {
  schemaId: string;
  schemaName: string;
  schema: JsonSchema;
};

type Status = "editing" | "submitting" | "done" | "closed";

export function PublicForm({ schemaId, schemaName, schema }: PublicFormProps) {
  const [fields] = useState(() => deriveFormFields(schema));
  const [values, setValues] = useState<FormValues>(() =>
    createInitialValues(fields),
  );
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("editing");

  function handleChange(path: FormPathSegment[], value: FormValue): void {
    setValues((current) => setValueAtPath(current, path, value));
  }

  async function submit(): Promise<void> {
    const validation = validateFormValues(fields, values);
    setMissingFields(validation.missingFields);
    setErrors([]);
    if (!validation.isValid) return;

    setStatus("submitting");
    try {
      const response = await fetch(`/api/public/forms/${schemaId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (response.status === 201) {
        setStatus("done");
        return;
      }
      if (response.status === 403 || response.status === 404) {
        setStatus("closed");
        return;
      }
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        details?: string[];
      } | null;
      setErrors(body?.details ?? [body?.error ?? "Could not send your response."]);
    } catch {
      setErrors(["Could not send your response."]);
    }
    setStatus("editing");
  }

  if (status === "closed") {
    return (
      <section className="builder-panel">
        <div className="empty-properties">
          <strong>This form is no longer accepting responses</strong>
          <span>Your response was not saved.</span>
        </div>
      </section>
    );
  }

  if (status === "done") {
    return (
      <section className="builder-panel">
        <div className="empty-properties">
          <strong>Thank you!</strong>
          <span>Your response has been submitted.</span>
        </div>
        <button
          className="button button-outline"
          type="button"
          onClick={() => {
            setValues(createInitialValues(fields));
            setStatus("editing");
          }}
        >
          Submit another response
        </button>
      </section>
    );
  }

  return (
    <section className="builder-panel" aria-labelledby="public-form-title">
      <div className="builder-heading">
        <div>
          <p className="eyebrow">Form</p>
          <h1 id="public-form-title">{schemaName}</h1>
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="empty-properties">
          <strong>This form has no fields</strong>
        </div>
      ) : (
        <>
          <FieldGroup
            fields={fields}
            values={values}
            path={[]}
            missingFields={missingFields}
            onChange={handleChange}
            onAddItem={(path, defaultValue) =>
              setValues((current) => addArrayItem(current, path, defaultValue))
            }
            onRemoveItem={(path, index) =>
              setValues((current) => removeArrayItem(current, path, index))
            }
          />
          <div className="properties-heading">
            <div>
              <h2>Submit</h2>
              <p>Send your response.</p>
            </div>
            <button
              className="button button-add"
              type="button"
              disabled={status === "submitting"}
              onClick={() => void submit()}
            >
              {status === "submitting" ? "Sending…" : "Submit"}
            </button>
          </div>
        </>
      )}

      {(missingFields.length > 0 || errors.length > 0) && (
        <div className="feedback-area" aria-live="polite">
          {missingFields.length > 0 && (
            <p className="feedback error">
              Fill in required fields: {missingFields.join(", ")}
            </p>
          )}
          {errors.map((message) => (
            <p key={message} className="feedback error">
              {message}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
