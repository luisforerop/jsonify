import type { SavedSchema } from "@/hooks/use-saved-schemas";

import { PanelHeading } from "./panel-heading";

type SavedSchemasPanelProps = {
  schemas: SavedSchema[];
  activeSchemaId: string | null;
  isLoaded: boolean;
  onOpenSchema: (id: string) => void;
  onDeleteSchema: (id: string) => void;
};

export function SavedSchemasPanel({
  schemas,
  activeSchemaId,
  isLoaded,
  onOpenSchema,
  onDeleteSchema,
}: SavedSchemasPanelProps) {
  return (
    <aside className="saved-panel" aria-label="Saved schemas">
      <PanelHeading
        eyebrow="Library"
        title="Saved schemas"
        badge={String(schemas.length)}
      />
      {!isLoaded && <p className="status-copy">Loading local library...</p>}
      {isLoaded && schemas.length === 0 && (
        <p className="status-copy">Your saved schemas will appear here.</p>
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
              onClick={() => onOpenSchema(schema.id)}
            >
              <strong>{schema.name}</strong>
              <span>{new Date(schema.updatedAt).toLocaleDateString()}</span>
            </button>
            <button
              className="delete-button"
              type="button"
              onClick={() => onDeleteSchema(schema.id)}
              aria-label={`Delete ${schema.name}`}
              title={`Delete ${schema.name}`}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
