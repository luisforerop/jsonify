import type { ReactNode } from "react";

import {
  JSON_SCHEMA_TYPES,
  type BuilderNode,
  type JsonSchemaType,
} from "@/lib/schema-builder";

export type PropertyEditorHandlers = {
  onAddChild: (parentId: string) => void;
  onNameChange: (nodeId: string, name: string) => void;
  onTypeChange: (nodeId: string, type: JsonSchemaType) => void;
  onRequiredChange: (nodeId: string, required: boolean) => void;
  onItemTypeChange: (nodeId: string, type: JsonSchemaType) => void;
  onRemove: (nodeId: string) => void;
};

type PropertyCollectionProps = PropertyEditorHandlers & {
  nodes: BuilderNode[];
};

export function PropertyCollection({
  nodes,
  ...handlers
}: PropertyCollectionProps) {
  return (
    <div className="property-collection">
      {nodes.map((node) => (
        <PropertyEditor key={node.id} node={node} {...handlers} />
      ))}
    </div>
  );
}

function PropertyEditor({
  node,
  onAddChild,
  onNameChange,
  onTypeChange,
  onRequiredChange,
  onItemTypeChange,
  onRemove,
}: PropertyEditorHandlers & { node: BuilderNode }) {
  const item = node.items;

  return (
    <article className="property-editor">
      <div className="property-row">
        <label>
          <span className="sr-only">Property name</span>
          <input
            value={node.name}
            onChange={(event) => onNameChange(node.id, event.target.value)}
            placeholder="property_name"
          />
        </label>
        <label>
          <span className="sr-only">Property type</span>
          <select
            value={node.type}
            onChange={(event) =>
              onTypeChange(node.id, event.target.value as JsonSchemaType)
            }
          >
            {JSON_SCHEMA_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="required-field">
          <input
            checked={node.required}
            type="checkbox"
            onChange={(event) =>
              onRequiredChange(node.id, event.target.checked)
            }
          />
          <span>Required</span>
        </label>
        <button
          className="remove-property-button"
          type="button"
          onClick={() => onRemove(node.id)}
          aria-label={`Remove ${node.name || "property"}`}
          title="Remove property"
        >
          Remove
        </button>
      </div>

      {node.type === "object" && (
        <NestedProperties
          label="Object properties"
          onAdd={() => onAddChild(node.id)}
        >
          <PropertyCollection
            nodes={node.properties ?? []}
            onAddChild={onAddChild}
            onNameChange={onNameChange}
            onTypeChange={onTypeChange}
            onRequiredChange={onRequiredChange}
            onItemTypeChange={onItemTypeChange}
            onRemove={onRemove}
          />
        </NestedProperties>
      )}

      {node.type === "array" && item && (
        <div className="array-definition">
          <label className="item-type-field">
            <span>Array items</span>
            <select
              value={item.type}
              onChange={(event) =>
                onItemTypeChange(node.id, event.target.value as JsonSchemaType)
              }
            >
              {JSON_SCHEMA_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          {item.type === "object" && (
            <NestedProperties
              label="Object item properties"
              onAdd={() => onAddChild(item.id)}
            >
              <PropertyCollection
                nodes={item.properties ?? []}
                onAddChild={onAddChild}
                onNameChange={onNameChange}
                onTypeChange={onTypeChange}
                onRequiredChange={onRequiredChange}
                onItemTypeChange={onItemTypeChange}
                onRemove={onRemove}
              />
            </NestedProperties>
          )}
        </div>
      )}
    </article>
  );
}

function NestedProperties({
  label,
  onAdd,
  children,
}: {
  label: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <section className="nested-properties">
      <div className="nested-heading">
        <span>{label}</span>
        <button className="text-button" type="button" onClick={onAdd}>
          Add nested property
        </button>
      </div>
      {children}
    </section>
  );
}
