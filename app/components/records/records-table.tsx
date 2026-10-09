"use client";

import { Fragment, useState } from "react";

import { CellValue } from "@/app/components/records/cell-value";
import { JsonTree } from "@/app/components/records/json-tree";
import type { SavedRecord } from "@/hooks/use-records";

type RecordsTableProps = {
  rows: SavedRecord[];
  columns: string[];
  schemaNames: Record<string, string>;
  showSchemaColumn: boolean;
  onOpen: (record: SavedRecord) => void;
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

export function RecordsTable({
  rows,
  columns,
  schemaNames,
  showSchemaColumn,
  onOpen,
}: RecordsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string): void {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const columnCount = columns.length + (showSchemaColumn ? 1 : 0) + 4;

  return (
    <div className="records-table-scroll">
      <table className="records-table">
        <thead>
          <tr>
            <th aria-label="Expand" />
            {showSchemaColumn && <th>Schema</th>}
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
            <th>Created</th>
            <th>Updated</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((record) => {
            const isOpen = expanded.has(record.id);
            return (
              <Fragment key={record.id}>
                <tr>
                  <td>
                    <button
                      type="button"
                      className="text-button"
                      aria-expanded={isOpen}
                      aria-label={isOpen ? "Collapse row" : "Expand row"}
                      onClick={() => toggle(record.id)}
                    >
                      {isOpen ? "▾" : "▸"}
                    </button>
                  </td>
                  {showSchemaColumn && (
                    <td>{schemaNames[record.schemaId] ?? "Unknown schema"}</td>
                  )}
                  {columns.map((column) => (
                    <td key={column}>
                      <CellValue value={record.payload[column]} />
                    </td>
                  ))}
                  <td className="cell-date">{formatDate(record.createdAt)}</td>
                  <td className="cell-date">{formatDate(record.updatedAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => onOpen(record)}
                    >
                      View
                    </button>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="records-subrow">
                    <td colSpan={columnCount}>
                      <JsonTree value={record.payload} initialDepth={2} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
