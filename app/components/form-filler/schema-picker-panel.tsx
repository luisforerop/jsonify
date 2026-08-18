import type { SavedSchema } from "@/hooks/use-saved-schemas";

import { PanelHeading } from "@/app/components/schema-builder/panel-heading";

type SchemaPickerPanelProps = {
  schemas: SavedSchema[];
  activeSchemaId: string | null;
  isLoaded: boolean;
  onSelectSchema: (id: string) => void;
};

export function SchemaPickerPanel({
  schemas,
  activeSchemaId,
  isLoaded,
  onSelectSchema,
}: SchemaPickerPanelProps) {
  return (
    <aside className="saved-panel" aria-label="Saved schemas">
      <PanelHeading
        eyebrow="Library"
        title="Saved schemas"
        badge={String(schemas.length)}
      />
      {!isLoaded && <p className="status-copy">Loading local library...</p>}
      {isLoaded && schemas.length === 0 && (
        <p className="status-copy">
          Save a schema in the schema builder to load it here.
        </p>
      )}
      <ul className="saved-list">
        {schemas.map((schema) => (
          <li
            className={
              schema.id === activeSchemaId
                ? "saved-item is-active"
                : "saved-item"
            }
            key={schema.id}
          >
            <button
              className="saved-schema-button"
              type="button"
              onClick={() => onSelectSchema(schema.id)}
            >
              <strong>{schema.name}</strong>
              <span>{new Date(schema.updatedAt).toLocaleDateString()}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
