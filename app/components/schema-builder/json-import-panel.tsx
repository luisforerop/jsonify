"use client";

import { useState } from "react";

import { schemaFromSampleJson, type BuilderNode } from "@/lib/schema-builder";

type JsonImportPanelProps = {
  createId: () => string;
  onGenerated: (properties: BuilderNode[]) => void;
};

const PLACEHOLDER = `{
  "test": "abc",
  "numeros": 123
}`;

export function JsonImportPanel({ createId, onGenerated }: JsonImportPanelProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function generate(): void {
    const result = schemaFromSampleJson(value, createId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onGenerated(result.properties);
  }

  return (
    <section className="builder-panel" aria-labelledby="json-import-title">
      <div className="builder-heading">
        <div>
          <p className="eyebrow">Schema editor</p>
          <h1 id="json-import-title">Generate from JSON</h1>
        </div>
        <span className="root-type">from JSON</span>
      </div>

      <p className="json-import-hint">
        Paste a sample JSON object. Its shape becomes the schema properties, which
        you can keep editing before saving. Generating replaces the current
        properties.
      </p>

      <label className="json-import-field">
        <span className="sr-only">Sample JSON</span>
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={PLACEHOLDER}
          rows={14}
          spellCheck={false}
        />
      </label>

      <button
        className="button button-add"
        type="button"
        onClick={generate}
        disabled={value.trim() === ""}
      >
        Generate schema
      </button>

      {error && (
        <div className="feedback-area" aria-live="polite">
          <p className="feedback error">{error}</p>
        </div>
      )}
    </section>
  );
}
