import type {
  NewRecord,
  RecordPatch,
  RecordRow,
} from "@/lib/server/repositories/types";

export interface RecordRepository {
  findById(id: string): Promise<RecordRow | null>;
  listByCollection(collectionId: string): Promise<RecordRow[]>;
  list(): Promise<RecordRow[]>;
  create(input: NewRecord): Promise<RecordRow>;
  update(id: string, patch: RecordPatch): Promise<RecordRow | null>;
  /** Refused by the database (`ResourceInUseError`) only via the schema restrict FK, never here. */
  delete(id: string): Promise<boolean>;
}
