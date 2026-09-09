"use client";

import { useState } from "react";

import {
  formValuesFromJson,
  type FormField,
  type FormValues,
} from "@/lib/schema-form";

export type PublishResult =
  | { status: "saved" }
  | { status: "invalid"; missingFields: string[] }
  | { status: "error" };

type FormJsonImportPanelProps = {
  fields: FormField[];
  onOpenInForm: (values: FormValues) => void;
  onPublish: (values: FormValues) => Promise<PublishResult>;
  onBack: () => void;
};

const PLACEHOLDER = `{
  "name": "Ada",
  "age": 42
}`;

export function FormJsonImportPanel({
  fields,
  onOpenInForm,
  onPublish,
  onBack,
}: FormJsonImportPanelProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  function parse(): FormValues | null {
    const result = formValuesFromJson(value, fields);
    if (!result.ok) {
      setError(result.error);
      setNotice(null);
      return null;
    }
    return result.values;
  }

  function openInForm(): void {
    const values = parse();
    if (!values) return;
    setError(null);
    setNotice(null);
    onOpenInForm(values);
  }

  async function publish(): Promise<void> {
    const values = parse();
    if (!values) return;

    setError(null);
    setNotice(null);
    setIsPublishing(true);
    const result = await onPublish(values);
    setIsPublishing(false);

    if (result.status === "saved") {
      setValue("");
      setNotice("Record saved.");
      return;
    }
    if (result.status === "invalid") {
      setError(
        `Missing required fields: ${result.missingFields.join(
          ", ",
        )}. Use “Open in form” to fill them in.`,
      );
      return;
    }
    setError("Could not save the record.");
  }

  const isEmpty = value.trim() === "";

  return (
    <section className="builder-panel" aria-labelledby="form-json-import-title">
      <div className="builder-heading">
        <div>
          <p className="eyebrow">Form filler</p>
          <h1 id="form-json-import-title">Fill from JSON</h1>
        </div>
        <button
          className="button button-outline"
          type="button"
          onClick={onBack}
        >
          Back to form
        </button>
      </div>

      <p className="json-import-hint">
        Paste a JSON object. Its values are mapped onto the loaded schema&apos;s
        fields and coerced to match each field&apos;s type; unknown keys are
        ignored. <strong>Publish record</strong> saves it straight to the
        database. <strong>Open in form</strong> loads the values into the form to
        review first — either way a new record is created.
      </p>

      <label className="json-import-field">
        <span className="sr-only">JSON object</span>
        <textarea
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setNotice(null);
          }}
          placeholder={PLACEHOLDER}
          rows={14}
          spellCheck={false}
        />
      </label>

      <div className="json-import-actions">
        <button
          className="button button-add"
          type="button"
          onClick={publish}
          disabled={isEmpty || isPublishing}
        >
          {isPublishing ? "Saving…" : "Publish record"}
        </button>
        <button
          className="button button-outline"
          type="button"
          onClick={openInForm}
          disabled={isEmpty || isPublishing}
        >
          Open in form
        </button>
      </div>

      {(error || notice) && (
        <div className="feedback-area" aria-live="polite">
          {error && <p className="feedback error">{error}</p>}
          {notice && <p className="feedback success">{notice}</p>}
        </div>
      )}
    </section>
  );
}
