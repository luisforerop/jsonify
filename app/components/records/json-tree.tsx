"use client";

import { useState } from "react";

type JsonTreeProps = {
  value: unknown;
  /** Containers deeper than this start collapsed. */
  initialDepth?: number;
};

function isContainer(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function Primitive({ value }: { value: unknown }) {
  if (value === null) return <span className="json-null">null</span>;
  if (typeof value === "string") {
    return <span className="json-string">&quot;{value}&quot;</span>;
  }
  return <span className="json-scalar">{String(value)}</span>;
}

function Node({
  label,
  value,
  depth,
  initialDepth,
}: {
  label?: string;
  value: unknown;
  depth: number;
  initialDepth: number;
}) {
  const [open, setOpen] = useState(depth < initialDepth);

  if (!isContainer(value)) {
    return (
      <li className="json-row">
        {label !== undefined && <span className="json-key">{label}: </span>}
        <Primitive value={value} />
      </li>
    );
  }

  const isArray = Array.isArray(value);
  const entries: [string, unknown][] = isArray
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value);
  const summary = isArray
    ? `[${entries.length}]`
    : `{${entries.length}}`;

  return (
    <li className="json-row">
      <button
        type="button"
        className="json-toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">{open ? "▾" : "▸"}</span>
        {label !== undefined && <span className="json-key">{label}</span>}
        <span className="json-summary">{summary}</span>
      </button>
      {open && entries.length > 0 && (
        <ul className="json-children">
          {entries.map(([key, child]) => (
            <Node
              key={key}
              label={key}
              value={child}
              depth={depth + 1}
              initialDepth={initialDepth}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Read-only collapsible view of any JSON value. Never mutates `value`. */
export function JsonTree({ value, initialDepth = 1 }: JsonTreeProps) {
  return (
    <ul className="json-tree">
      <Node value={value} depth={0} initialDepth={initialDepth} />
    </ul>
  );
}
