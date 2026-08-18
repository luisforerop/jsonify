import type { ChangeEvent } from "react";

import type { BuilderNode } from "@/lib/schema-builder";

import {
  PropertyCollection,
  type PropertyEditorHandlers,
} from "./property-editor";

type SchemaEditorProps = PropertyEditorHandlers & {
  schemaName: string;
  properties: BuilderNode[];
  validationErrors: string[];
  persistenceError: string | null;
  notice: string | null;
  onSchemaNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAddProperty: () => void;
};

export function SchemaEditor({
  schemaName,
  properties,
  validationErrors,
  persistenceError,
  notice,
  onSchemaNameChange,
  onAddProperty,
  ...propertyEditorHandlers
}: SchemaEditorProps) {
  return (
    <section className="builder-panel" aria-labelledby="builder-title">
      <div className="builder-heading">
        <div>
          <p className="eyebrow">Schema editor</p>
          <h1 id="builder-title">Build your data shape</h1>
        </div>
        <span className="root-type">root object</span>
      </div>
      <label className="schema-name-field">
        <span>Schema name</span>
        <input
          value={schemaName}
          onChange={onSchemaNameChange}
          placeholder="Customer profile"
        />
      </label>
      <div className="properties-heading">
        <div>
          <h2>Properties</h2>
          <p>Define the fields accepted by this object.</p>
        </div>
        <button
          className="button button-add"
          type="button"
          onClick={onAddProperty}
        >
          Add property
        </button>
      </div>

      {properties.length === 0 ? (
        <div className="empty-properties">
          <strong>Start with a property</strong>
          <span>Give it a name, then select the value type.</span>
        </div>
      ) : (
        <PropertyCollection nodes={properties} {...propertyEditorHandlers} />
      )}

      {(validationErrors.length > 0 || persistenceError || notice) && (
        <div className="feedback-area" aria-live="polite">
          {validationErrors.map((message) => (
            <p className="feedback error" key={message}>
              {message}
            </p>
          ))}
          {persistenceError && (
            <p className="feedback error">{persistenceError}</p>
          )}
          {notice && <p className="feedback success">{notice}</p>}
        </div>
      )}
    </section>
  );
}
