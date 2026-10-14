import type { SavedSchema } from "@/hooks/use-saved-schemas";

import { ShareControl } from "@/app/components/form-filler/share-control";
import { PanelHeading } from "@/app/components/schema-builder/panel-heading";

type SchemaPickerPanelProps = {
  schemas: SavedSchema[];
  activeSchemaId: string | null;
  isLoaded: boolean;
  onSelectSchema: (id: string) => void;
  onToggleSharing: (id: string, enabled: boolean) => Promise<boolean>;
};

export function SchemaPickerPanel({
  schemas,
  activeSchemaId,
  isLoaded,
  onSelectSchema,
  onToggleSharing,
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
      {schemas
        .filter((schema) => schema.id === activeSchemaId)
        .map((schema) => (
          <ShareControl
            key={schema.id}
            schema={schema}
            onToggle={(enabled) => onToggleSharing(schema.id, enabled)}
          />
        ))}
    </aside>
  );
}
