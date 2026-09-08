"use client";

import { useState } from "react";

import type { FormValues } from "@/lib/schema-form";

import { PanelHeading } from "@/app/components/schema-builder/panel-heading";

/** A saved record enriched with its source schema's name for display. */
export type SavedEntry = {
  id: string;
  schemaLabel: string;
  payload: FormValues;
  updatedAt: string;
};

type SavedEntriesPanelProps = {
  entries: SavedEntry[];
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

  async function copyEntryValues(entry: SavedEntry): Promise<void> {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(entry.payload, null, 2),
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
              <strong>{entry.schemaLabel}</strong>
              <span>{new Date(entry.updatedAt).toLocaleDateString()}</span>
            </button>
            <button
              className="copy-button"
              type="button"
              onClick={() => copyEntryValues(entry)}
              aria-label={`Copy ${entry.schemaLabel} record as JSON`}
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
              aria-label={`Delete ${entry.schemaLabel} record`}
              title="Delete record"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
