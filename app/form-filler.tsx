"use client";

import { useState } from "react";

import { ScopedTool } from "@/app/components/collections/scoped-tool";
import { FormFillerHeader } from "@/app/components/form-filler/workspace-header";
import { FormPanel } from "@/app/components/form-filler/form-panel";
import { SavedEntriesPanel } from "@/app/components/form-filler/saved-entries-panel";
import { SchemaPickerPanel } from "@/app/components/form-filler/schema-picker-panel";
import type { Collection } from "@/hooks/use-collections";
import { useRecords } from "@/hooks/use-records";
import { useSavedSchemas } from "@/hooks/use-saved-schemas";
import type { Workspace } from "@/hooks/use-workspaces";
import {
  addArrayItem,
  createInitialValues,
  deriveFormFields,
  removeArrayItem,
  setValueAtPath,
  validateFormValues,
  type FormField,
  type FormPathSegment,
  type FormValue,
  type FormValues,
} from "@/lib/schema-form";

type FormFillerProps = {
  workspaceSlug: string;
  collectionSlug: string;
};

export default function FormFiller({
  workspaceSlug,
  collectionSlug,
}: FormFillerProps) {
  return (
    <ScopedTool workspaceSlug={workspaceSlug} collectionSlug={collectionSlug}>
      {({ workspace, collection }) => (
        <FormFillerInner workspace={workspace} collection={collection} />
      )}
    </ScopedTool>
  );
}

type FormFillerInnerProps = {
  workspace: Workspace;
  collection: Collection;
};

function FormFillerInner({ workspace, collection }: FormFillerInnerProps) {
  const [activeSchemaId, setActiveSchemaId] = useState<string | null>(null);
  const [schemaName, setSchemaName] = useState<string | null>(null);
  const [recordName, setRecordName] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [values, setValues] = useState<FormValues>({});
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [nameMissing, setNameMissing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const { schemas, isLoaded: schemasLoaded } = useSavedSchemas(collection.id);
  const {
    records,
    error,
    isLoaded: recordsLoaded,
    create,
    update,
    remove,
  } = useRecords(collection.id);

  function loadSchema(id: string): void {
    const savedSchema = schemas.find((schema) => schema.id === id);
    if (!savedSchema) return;

    const derivedFields = deriveFormFields(savedSchema.schema);
    setActiveSchemaId(savedSchema.id);
    setSchemaName(savedSchema.name);
    setRecordName("");
    setFields(derivedFields);
    setValues(createInitialValues(derivedFields));
    setActiveRecordId(null);
    setMissingFields([]);
    setNameMissing(false);
    setNotice(`Loaded ${savedSchema.name}.`);
  }

  function loadRecord(id: string): void {
    const record = records.find((candidate) => candidate.id === id);
    if (!record) return;

    const savedSchema = schemas.find((schema) => schema.id === record.schemaId);
    const derivedFields = savedSchema
      ? deriveFormFields(savedSchema.schema)
      : fields;

    setActiveSchemaId(record.schemaId);
    setSchemaName(record.schemaName);
    setRecordName(record.name);
    setFields(derivedFields);
    setValues(record.values);
    setActiveRecordId(record.id);
    setMissingFields([]);
    setNameMissing(false);
    setNotice(`Opened record for ${record.schemaName}.`);
  }

  function startNewRecord(): void {
    setRecordName("");
    setValues(createInitialValues(fields));
    setActiveRecordId(null);
    setMissingFields([]);
    setNameMissing(false);
    setNotice(null);
  }

  function handleChange(path: FormPathSegment[], value: FormValue): void {
    setValues((current) => setValueAtPath(current, path, value));
  }

  function handleAddItem(
    path: FormPathSegment[],
    defaultValue: FormValue,
  ): void {
    setValues((current) => addArrayItem(current, path, defaultValue));
  }

  function handleRemoveItem(path: FormPathSegment[], index: number): void {
    setValues((current) => removeArrayItem(current, path, index));
  }

  async function submit(): Promise<void> {
    if (!activeSchemaId || !schemaName) return;

    const trimmedName = recordName.trim();
    const validation = validateFormValues(fields, values);
    setMissingFields(validation.missingFields);
    setNameMissing(!trimmedName);
    setNotice(null);
    if (!trimmedName || !validation.isValid) return;

    const input = {
      name: trimmedName,
      collectionId: collection.id,
      schemaId: activeSchemaId,
      schemaName,
      values,
    };
    const savedRecord = activeRecordId
      ? await update(activeRecordId, input)
      : await create(input);

    if (savedRecord) {
      setActiveRecordId(savedRecord.id);
      setRecordName(savedRecord.name);
      setNotice(activeRecordId ? "Record updated." : "Record saved.");
    }
  }

  async function deleteRecord(id: string): Promise<void> {
    if (await remove(id)) {
      if (id === activeRecordId) startNewRecord();
      setNotice("Record deleted.");
    }
  }

  return (
    <main className="workspace-shell">
      <FormFillerHeader
        workspace={workspace}
        collection={collection}
        isEditingRecord={activeRecordId !== null}
        onNewRecord={startNewRecord}
      />

      <div className="workspace-grid">
        <SchemaPickerPanel
          schemas={schemas}
          activeSchemaId={activeSchemaId}
          isLoaded={schemasLoaded}
          onSelectSchema={loadSchema}
        />
        <FormPanel
          schemaName={schemaName}
          entryName={recordName}
          fields={fields}
          values={values}
          missingFields={missingFields}
          nameMissing={nameMissing}
          persistenceError={error}
          notice={notice}
          isEditingEntry={activeRecordId !== null}
          onEntryNameChange={(event) => setRecordName(event.target.value)}
          onChange={handleChange}
          onAddItem={handleAddItem}
          onRemoveItem={handleRemoveItem}
          onSubmit={submit}
        />
        <SavedEntriesPanel
          entries={records}
          activeEntryId={activeRecordId}
          isLoaded={recordsLoaded}
          onOpenEntry={loadRecord}
          onDeleteEntry={deleteRecord}
        />
      </div>
    </main>
  );
}
