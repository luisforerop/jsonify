import type { JsonSchema } from "@/lib/schema-builder";

import { PanelHeading } from "./panel-heading";

type SchemaPreviewProps = {
  schema: JsonSchema;
};

export function SchemaPreview({ schema }: SchemaPreviewProps) {
  return (
    <aside className="preview-panel" aria-label="Generated JSON Schema preview">
      <PanelHeading eyebrow="Live output" title="JSON Schema" badge="Live" />
      <pre>{JSON.stringify(schema, null, 2)}</pre>
    </aside>
  );
}
