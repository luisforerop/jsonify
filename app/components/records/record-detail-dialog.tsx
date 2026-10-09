"use client";

import { useState } from "react";

import { JsonTree } from "@/app/components/records/json-tree";
import type { SavedRecord } from "@/hooks/use-records";

type RecordDetailDialogProps = {
  record: SavedRecord;
  schemaName: string;
  onClose: () => void;
  onDelete: (record: SavedRecord) => Promise<boolean>;
};

export function RecordDetailDialog({
  record,
  schemaName,
  onClose,
  onDelete,
}: RecordDetailDialogProps) {
  const [confirming, setConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function confirmDelete(): Promise<void> {
    setIsDeleting(true);
    const deleted = await onDelete(record);
    setIsDeleting(false);
    if (deleted) onClose();
    else setConfirming(false);
  }

  return (
    <div className="record-dialog-backdrop" onClick={onClose}>
      <div
        className="record-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-dialog-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <div className="builder-heading">
          <div>
            <p className="eyebrow">{schemaName}</p>
            <h2 id="record-dialog-title">Record</h2>
          </div>
          <button type="button" className="text-button" onClick={onClose} autoFocus>
            Close
          </button>
        </div>
        <p className="status-copy">
          Created {new Date(record.createdAt).toLocaleString()} · Updated{" "}
          {new Date(record.updatedAt).toLocaleString()}
        </p>
        <JsonTree value={record.payload} initialDepth={3} />
        <div className="topbar-actions">
          {confirming ? (
            <>
              <span className="status-copy">Delete this record?</span>
              <button
                type="button"
                className="delete-button"
                disabled={isDeleting}
                onClick={() => void confirmDelete()}
              >
                Confirm delete
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className="delete-button"
              onClick={() => setConfirming(true)}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
