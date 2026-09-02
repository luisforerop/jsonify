import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

export type Store = {
  users: StoredRecord[];
  workspaces: StoredRecord[];
  collections: StoredRecord[];
  schemas: StoredRecord[];
  records: StoredRecord[];
};

export type CollectionName = keyof Store;

export function emptyStore(): Store {
  return {
    users: [],
    workspaces: [],
    collections: [],
    schemas: [],
    records: [],
  };
}

/**
 * Directory holding the JSON store. Resolved lazily so tests can point it at a
 * temp directory via the `JSONIFY_DATA_DIR` environment variable.
 */
function storeDir(): string {
  const override = process.env.JSONIFY_DATA_DIR;
  return override ? path.resolve(override) : path.join(process.cwd(), "data");
}

function storeFile(): string {
  return path.join(storeDir(), "jsonify.json");
}

function isStoredRecord(value: unknown): value is StoredRecord {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<StoredRecord>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  );
}

function coerceCollection(value: unknown): StoredRecord[] {
  return Array.isArray(value) ? value.filter(isStoredRecord) : [];
}

function coerceStore(value: unknown): Store {
  if (typeof value !== "object" || value === null) return emptyStore();
  const candidate = value as Record<string, unknown>;
  return {
    users: coerceCollection(candidate.users),
    workspaces: coerceCollection(candidate.workspaces),
    collections: coerceCollection(candidate.collections),
    schemas: coerceCollection(candidate.schemas),
    records: coerceCollection(candidate.records),
  };
}

/**
 * Read the whole store. A missing file, unparseable JSON, or an unexpected
 * shape all resolve to an empty store rather than throwing.
 */
export async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(storeFile(), "utf8");
    return coerceStore(JSON.parse(raw));
  } catch {
    return emptyStore();
  }
}

/**
 * Write the store via a temp file + atomic rename so a crash mid-write cannot
 * leave a truncated file behind.
 */
async function writeStore(store: Store): Promise<void> {
  const dir = storeDir();
  await mkdir(dir, { recursive: true });
  const tmp = path.join(dir, `jsonify.json.${randomUUID()}.tmp`);
  await writeFile(tmp, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(tmp, storeFile());
}

let writeQueue: Promise<unknown> = Promise.resolve();

/** Serialize mutations so concurrent read-modify-write cycles cannot clobber each other. */
function withLock<T>(operation: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(operation, operation);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function listCollection(
  collection: CollectionName,
): Promise<StoredRecord[]> {
  const store = await readStore();
  return store[collection];
}

export function createRecord(
  collection: CollectionName,
  input: Record<string, unknown>,
): Promise<StoredRecord> {
  return withLock(async () => {
    const store = await readStore();
    const now = new Date().toISOString();
    const record: StoredRecord = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    store[collection] = [...store[collection], record];
    await writeStore(store);
    return record;
  });
}

export function updateRecord(
  collection: CollectionName,
  id: string,
  input: Record<string, unknown>,
): Promise<StoredRecord | null> {
  return withLock(async () => {
    const store = await readStore();
    const existing = store[collection].find((record) => record.id === id);
    if (!existing) return null;

    const updated: StoredRecord = {
      ...existing,
      ...input,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    store[collection] = store[collection].map((record) =>
      record.id === id ? updated : record,
    );
    await writeStore(store);
    return updated;
  });
}

export function removeRecord(
  collection: CollectionName,
  id: string,
): Promise<boolean> {
  return withLock(async () => {
    const store = await readStore();
    const next = store[collection].filter((record) => record.id !== id);
    if (next.length === store[collection].length) return false;
    store[collection] = next;
    await writeStore(store);
    return true;
  });
}
