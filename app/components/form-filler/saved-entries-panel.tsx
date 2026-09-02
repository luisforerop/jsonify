"use client";

import { useState } from "react";

import type { SavedRecord } from "@/hooks/use-records";

import { PanelHeading } from "@/app/components/schema-builder/panel-heading";

type SavedEntriesPanelProps = {
  entries: SavedRecord[];
  activeEntryId: string | null;
  isLoaded: boolean;
  onOpenEntry: (id: string) => void;
  onDeleteEntry: (id: string) => void;
};

export function SavedEntriesPanel({
  entries,
  activeEntryId,
  isLoaded,
  onOpenEntry,
  onDeleteEntry,
}: SavedEntriesPanelProps) {
  const [copyState, setCopyState] = useState<{
    id: string;
    status: "copied" | "error";
  } | null>(null);

  async function copyEntryValues(entry: SavedRecord): Promise<void> {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(entry.values, null, 2),
      );
      setCopyState({ id: entry.id, status: "copied" });
    } catch {
      setCopyState({ id: entry.id, status: "error" });
    } finally {
      window.setTimeout(() => setCopyState(null), 1500);
    }
  }

  return (
    <aside className="preview-panel" aria-label="Saved records">
      <PanelHeading
        eyebrow="Submissions"
        title="Saved records"
        badge={String(entries.length)}
      />
      {!isLoaded && <p className="status-copy">Loading records...</p>}
      {isLoaded && entries.length === 0 && (
        <p className="status-copy">Submitted records will appear here.</p>
      )}
      <ul className="saved-list">
        {entries.map((entry) => (
          <li
            className={
              entry.id === activeEntryId ? "saved-item is-active" : "saved-item"
            }
            key={entry.id}
          >
            <button
              className="saved-schema-button"
              type="button"
              onClick={() => onOpenEntry(entry.id)}
            >
              <strong>{entry.name}</strong>
              <span>
                {entry.schemaName} ·{" "}
                {new Date(entry.updatedAt).toLocaleDateString()}
              </span>
            </button>
            <button
              className="copy-button"
              type="button"
              onClick={() => copyEntryValues(entry)}
              aria-label={`Copy ${entry.name} as JSON`}
              title="Copy as JSON"
            >
              {copyState?.id === entry.id
                ? copyState.status === "copied"
                  ? "Copied!"
                  : "Copy failed"
                : "Copy JSON"}
            </button>
            <button
              className="delete-button"
              type="button"
              onClick={() => onDeleteEntry(entry.id)}
              aria-label={`Delete ${entry.name}`}
              title="Delete entry"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
