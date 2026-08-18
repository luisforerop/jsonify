import type { ChangeEvent } from "react";

import type {
  FormField,
  FormPathSegment,
  FormValue,
  FormValues,
} from "@/lib/schema-form";

import { FieldGroup } from "./field-editor";

type FormPanelProps = {
  schemaName: string | null;
  entryName: string;
  fields: FormField[];
  values: FormValues;
  missingFields: string[];
  nameMissing: boolean;
  persistenceError: string | null;
  notice: string | null;
  isEditingEntry: boolean;
  onEntryNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onChange: (path: FormPathSegment[], value: FormValue) => void;
  onAddItem: (path: FormPathSegment[], defaultValue: FormValue) => void;
  onRemoveItem: (path: FormPathSegment[], index: number) => void;
  onSubmit: () => void;
};

export function FormPanel({
  schemaName,
  entryName,
  fields,
  values,
  missingFields,
  nameMissing,
  persistenceError,
  notice,
  isEditingEntry,
  onEntryNameChange,
  onChange,
  onAddItem,
  onRemoveItem,
  onSubmit,
}: FormPanelProps) {
  return (
    <section className="builder-panel" aria-labelledby="form-filler-title">
      <div className="builder-heading">
        <div>
          <p className="eyebrow">Form filler</p>
          <h1 id="form-filler-title">
            {schemaName ?? "Load a schema to begin"}
          </h1>
        </div>
        {isEditingEntry && <span className="root-type">editing entry</span>}
      </div>

      {!schemaName ? (
        <div className="empty-properties">
          <strong>No schema loaded</strong>
          <span>Select a saved schema from the list to generate a form.</span>
        </div>
      ) : fields.length === 0 ? (
        <div className="empty-properties">
          <strong>This schema has no properties</strong>
          <span>Add properties to it in the schema builder first.</span>
        </div>
      ) : (
        <>
          <label className="schema-name-field">
            <span>Entry name</span>
            <input
              value={entryName}
              onChange={onEntryNameChange}
              placeholder="Ada's profile"
            />
          </label>
          <FieldGroup
            fields={fields}
            values={values}
            path={[]}
            missingFields={missingFields}
            onChange={onChange}
            onAddItem={onAddItem}
            onRemoveItem={onRemoveItem}
          />
          <div className="properties-heading">
            <div>
              <h2>Submit</h2>
              <p>Save the filled values as a form entry.</p>
            </div>
            <button
              className="button button-add"
              type="button"
              onClick={onSubmit}
            >
              {isEditingEntry ? "Update entry" : "Save entry"}
            </button>
          </div>
        </>
      )}

      {(nameMissing ||
        missingFields.length > 0 ||
        persistenceError ||
        notice) && (
        <div className="feedback-area" aria-live="polite">
          {nameMissing && (
            <p className="feedback error">Enter a name for this entry.</p>
          )}
          {missingFields.length > 0 && (
            <p className="feedback error">
              Fill in required fields: {missingFields.join(", ")}
            </p>
          )}
          {persistenceError && (
            <p className="feedback error">{persistenceError}</p>
          )}
          {notice && <p className="feedback success">{notice}</p>}
        </div>
      )}
    </section>
  );
}
