import type {
  FormField,
  FormPathSegment,
  FormValue,
  FormValues,
} from "@/lib/schema-form";

import { FieldGroup } from "./field-editor";

type FormPanelProps = {
  schemaName: string | null;
  fields: FormField[];
  values: FormValues;
  missingFields: string[];
  persistenceError: string | null;
  notice: string | null;
  isEditingEntry: boolean;
  onChange: (path: FormPathSegment[], value: FormValue) => void;
  onAddItem: (path: FormPathSegment[], defaultValue: FormValue) => void;
  onRemoveItem: (path: FormPathSegment[], index: number) => void;
  onSubmit: () => void;
  onEnterImport: () => void;
};

export function FormPanel({
  schemaName,
  fields,
  values,
  missingFields,
  persistenceError,
  notice,
  isEditingEntry,
  onChange,
  onAddItem,
  onRemoveItem,
  onSubmit,
  onEnterImport,
}: FormPanelProps) {
  const canImport = schemaName !== null && fields.length > 0;

  return (
    <section className="builder-panel" aria-labelledby="form-filler-title">
      <div className="builder-heading">
        <div>
          <p className="eyebrow">Form filler</p>
          <h1 id="form-filler-title">
            {schemaName ?? "Load a schema to begin"}
          </h1>
        </div>
        <div className="builder-heading-actions">
          {isEditingEntry && <span className="root-type">editing entry</span>}
          {canImport && (
            <button
              className="button button-outline"
              type="button"
              onClick={onEnterImport}
            >
              Fill from JSON
            </button>
          )}
        </div>
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
              <p>Save the filled values as a record.</p>
            </div>
            <button
              className="button button-add"
              type="button"
              onClick={onSubmit}
            >
              {isEditingEntry ? "Update record" : "Save record"}
            </button>
          </div>
        </>
      )}

      {(missingFields.length > 0 || persistenceError || notice) && (
        <div className="feedback-area" aria-live="polite">
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
