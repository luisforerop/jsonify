"use client";

import { useDeferredValue, useState } from "react";

import { SavedSchemasPanel } from "@/app/components/schema-builder/saved-schemas-panel";
import { SchemaEditor } from "@/app/components/schema-builder/schema-editor";
import { SchemaPreview } from "@/app/components/schema-builder/schema-preview";
import { WorkspaceHeader } from "@/app/components/schema-builder/workspace-header";
import { useSavedSchemas } from "@/hooks/use-saved-schemas";
import {
  changeNodeType,
  createBuilderNode,
  createJsonSchema,
  propertiesFromJsonSchema,
  removeNode,
  updateNode,
  validateSchema,
  type BuilderNode,
} from "@/lib/schema-builder";

function createId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `node-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export default function SchemaBuilder() {
  const [schemaName, setSchemaName] = useState("");
  const [properties, setProperties] = useState<BuilderNode[]>([]);
  const [activeSchemaId, setActiveSchemaId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const { schemas, error, isLoaded, create, update, remove } =
    useSavedSchemas();
  const preview = createJsonSchema(
    useDeferredValue(schemaName),
    useDeferredValue(properties),
  );

  function addProperty(parentId?: string): void {
    const property = createBuilderNode(createId());
    if (!parentId) {
      setProperties((current) => [...current, property]);
      return;
    }
    setProperties((current) =>
      updateNode(current, parentId, (node) =>
        node.type === "object"
          ? { ...node, properties: [...(node.properties ?? []), property] }
          : node,
      ),
    );
  }

  function saveSchema(): void {
    const validation = validateSchema(schemaName, properties);
    setValidationErrors(validation.errors);
    setNotice(null);
    if (!validation.isValid) return;

    const schema = createJsonSchema(schemaName, properties);
    const savedSchema = activeSchemaId
      ? update(activeSchemaId, { name: schemaName.trim(), schema })
      : create({ name: schemaName.trim(), schema });
    if (savedSchema) {
      setActiveSchemaId(savedSchema.id);
      setNotice(
        activeSchemaId ? "Schema updated locally." : "Schema saved locally.",
      );
    }
  }

  function startNewSchema(): void {
    setSchemaName("");
    setProperties([]);
    setActiveSchemaId(null);
    setValidationErrors([]);
    setNotice(null);
  }

  function openSchema(id: string): void {
    const savedSchema = schemas.find((schema) => schema.id === id);
    if (!savedSchema) return;
    setSchemaName(savedSchema.name);
    setProperties(propertiesFromJsonSchema(savedSchema.schema, createId));
    setActiveSchemaId(savedSchema.id);
    setValidationErrors([]);
    setNotice(`Opened ${savedSchema.name}.`);
  }

  function deleteSchema(id: string): void {
    if (remove(id)) {
      if (id === activeSchemaId) startNewSchema();
      setNotice("Schema deleted.");
    }
  }

  return (
    <main className="workspace-shell">
      <WorkspaceHeader
        isEditing={activeSchemaId !== null}
        onNewSchema={startNewSchema}
        onSaveSchema={saveSchema}
      />

      <div className="workspace-grid">
        <SavedSchemasPanel
          schemas={schemas}
          activeSchemaId={activeSchemaId}
          isLoaded={isLoaded}
          onOpenSchema={openSchema}
          onDeleteSchema={deleteSchema}
        />
        <SchemaEditor
          schemaName={schemaName}
          properties={properties}
          validationErrors={validationErrors}
          persistenceError={error}
          notice={notice}
          onSchemaNameChange={(event) => setSchemaName(event.target.value)}
          onAddProperty={() => addProperty()}
          onAddChild={addProperty}
          onNameChange={(id, name) =>
            setProperties((current) =>
              updateNode(current, id, (node) => ({ ...node, name })),
            )
          }
          onTypeChange={(id, type) =>
            setProperties((current) =>
              updateNode(current, id, (node) =>
                changeNodeType(node, type, createId),
              ),
            )
          }
          onRequiredChange={(id, required) =>
            setProperties((current) =>
              updateNode(current, id, (node) => ({ ...node, required })),
            )
          }
          onItemTypeChange={(id, type) =>
            setProperties((current) =>
              updateNode(current, id, (node) =>
                node.type === "array"
                  ? {
                      ...node,
                      items: changeNodeType(
                        node.items ?? createBuilderNode(createId(), "items"),
                        type,
                        createId,
                      ),
                    }
                  : node,
              ),
            )
          }
          onRemove={(id) => setProperties((current) => removeNode(current, id))}
        />
        <SchemaPreview schema={preview} />
      </div>
    </main>
  );
}
