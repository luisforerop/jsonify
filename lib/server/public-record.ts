import type { RecordRow } from "@/lib/server/repositories";

/**
 * A record as exposed by the public `/api/v1` API. The submitted values live
 * under `content`; `schemaVersion` is the name of the schema the record was
 * validated against (resolved by the caller from `record.schemaId`). Internal
 * association fields are not surfaced.
 */
export type PublicRecord = {
  id: string;
  schemaVersion: string;
  content: unknown;
  createdAt: string;
  updatedAt: string;
};

export function toPublicRecord(
  record: RecordRow,
  schemaName: string,
): PublicRecord {
  return {
    id: record.id,
    schemaVersion: schemaName,
    content: record.payload ?? {},
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
