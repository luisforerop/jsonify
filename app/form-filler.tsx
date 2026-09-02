"use client";

import { useState } from "react";

import { FormFillerHeader } from "@/app/components/form-filler/workspace-header";
import { FormPanel } from "@/app/components/form-filler/form-panel";
import { SavedEntriesPanel } from "@/app/components/form-filler/saved-entries-panel";
import { SchemaPickerPanel } from "@/app/components/form-filler/schema-picker-panel";
import { useFormEntries } from "@/hooks/use-form-entries";
import { useProjects } from "@/hooks/use-projects";
import { useSavedSchemas } from "@/hooks/use-saved-schemas";
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
  projectId: string;
};

export default function FormFiller({ projectId }: FormFillerProps) {
  const [activeSchemaId, setActiveSchemaId] = useState<string | null>(null);
  const [schemaName, setSchemaName] = useState<string | null>(null);
  const [entryName, setEntryName] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [values, setValues] = useState<FormValues>({});
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [nameMissing, setNameMissing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const { schemas, isLoaded: schemasLoaded } = useSavedSchemas(projectId);
  const { projects } = useProjects();
  const activeProjectName =
    projects.find((project) => project.id === projectId)?.name ?? null;
  const {
    entries: allEntries,
    error,
    isLoaded: entriesLoaded,
    create,
    update,
    remove,
  } = useFormEntries();
  const projectSchemaIds = new Set(schemas.map((schema) => schema.id));
  const entries = allEntries.filter((entry) =>
    projectSchemaIds.has(entry.schemaId),
  );

  function loadSchema(id: string): void {
    const savedSchema = schemas.find((schema) => schema.id === id);
    if (!savedSchema) return;

    const derivedFields = deriveFormFields(savedSchema.schema);
    setActiveSchemaId(savedSchema.id);
    setSchemaName(savedSchema.name);
    setEntryName("");
    setFields(derivedFields);
    setValues(createInitialValues(derivedFields));
    setActiveEntryId(null);
    setMissingFields([]);
    setNameMissing(false);
    setNotice(`Loaded ${savedSchema.name}.`);
  }

  function loadEntry(id: string): void {
    const entry = entries.find((candidate) => candidate.id === id);
    if (!entry) return;

    const savedSchema = schemas.find((schema) => schema.id === entry.schemaId);
    const derivedFields = savedSchema
      ? deriveFormFields(savedSchema.schema)
      : fields;

    setActiveSchemaId(entry.schemaId);
    setSchemaName(entry.schemaName);
    setEntryName(entry.name);
    setFields(derivedFields);
    setValues(entry.values);
    setActiveEntryId(entry.id);
    setMissingFields([]);
    setNameMissing(false);
    setNotice(`Opened entry for ${entry.schemaName}.`);
  }

  function startNewEntry(): void {
    setEntryName("");
    setValues(createInitialValues(fields));
    setActiveEntryId(null);
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

    const trimmedName = entryName.trim();
    const validation = validateFormValues(fields, values);
    setMissingFields(validation.missingFields);
    setNameMissing(!trimmedName);
    setNotice(null);
    if (!trimmedName || !validation.isValid) return;

    const savedEntry = activeEntryId
      ? await update(activeEntryId, {
          name: trimmedName,
          schemaId: activeSchemaId,
          schemaName,
          values,
        })
      : await create({
          name: trimmedName,
          schemaId: activeSchemaId,
          schemaName,
          values,
        });

    if (savedEntry) {
      setActiveEntryId(savedEntry.id);
      setEntryName(savedEntry.name);
      setNotice(
        activeEntryId ? "Entry updated locally." : "Entry saved locally.",
      );
    }
  }

  async function deleteEntry(id: string): Promise<void> {
    if (await remove(id)) {
      if (id === activeEntryId) startNewEntry();
      setNotice("Entry deleted.");
    }
  }

  return (
    <main className="workspace-shell">
      <FormFillerHeader
        projectId={projectId}
        projectName={activeProjectName}
        isEditingEntry={activeEntryId !== null}
        onNewEntry={startNewEntry}
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
          entryName={entryName}
          fields={fields}
          values={values}
          missingFields={missingFields}
          nameMissing={nameMissing}
          persistenceError={error}
          notice={notice}
          isEditingEntry={activeEntryId !== null}
          onEntryNameChange={(event) => setEntryName(event.target.value)}
          onChange={handleChange}
          onAddItem={handleAddItem}
          onRemoveItem={handleRemoveItem}
          onSubmit={submit}
        />
        <SavedEntriesPanel
          entries={entries}
          activeEntryId={activeEntryId}
          isLoaded={entriesLoaded}
          onOpenEntry={loadEntry}
          onDeleteEntry={deleteEntry}
        />
      </div>
    </main>
  );
}
