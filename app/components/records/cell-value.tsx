import { describeCell } from "@/lib/records-table";

/** One-line rendering of a payload value; full values live in the row expansion. */
export function CellValue({ value }: { value: unknown }) {
  const cell = describeCell(value);

  switch (cell.kind) {
    case "missing":
      return null;
    case "null":
      return <span className="cell-muted">null</span>;
    case "text":
      return (
        <span className="cell-text" title={cell.text}>
          {cell.text}
        </span>
      );
    case "empty":
      return (
        <span className="cell-muted">
          {cell.container === "array" ? "empty list" : "empty object"}
        </span>
      );
    case "list":
      return (
        <span className="cell-chips" title={`${cell.count} items`}>
          {cell.preview.map((item, index) => (
            <span className="cell-chip" key={index}>
              {item}
            </span>
          ))}
          {cell.more > 0 && <span className="cell-muted">+{cell.more}</span>}
        </span>
      );
    case "items":
      return (
        <span className="cell-chip cell-chip-count">
          {cell.count} {cell.count === 1 ? "item" : "items"}
        </span>
      );
    case "object":
      return (
        <span className="cell-chips" title={`${cell.count} keys`}>
          {cell.preview.map((pair) => (
            <span className="cell-chip" key={pair.key}>
              <span className="cell-muted">{pair.key}:</span> {pair.value}
            </span>
          ))}
          {cell.more > 0 && <span className="cell-muted">+{cell.more}</span>}
        </span>
      );
  }
}
