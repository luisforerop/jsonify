import type { StoredRecord } from "@/lib/server/json-store";

/**
 * A record as exposed by the public `/api/v1` API. The submitted values live
 * under `content`; `schemaVersion` is the name of the schema the record was
 * validated against. Internal association fields (`collectionId`, `schemaId`,
 * the generated display `name`) are not surfaced.
 */
export type PublicRecord = {
  id: string;
  schemaVersion: string;
  content: unknown;
  createdAt: string;
  updatedAt: string;
};

export function toPublicRecord(stored: StoredRecord): PublicRecord {
  return {
    id: stored.id,
    schemaVersion:
      typeof stored.schemaName === "string" ? stored.schemaName : "",
    content: stored.values ?? {},
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
  };
}
