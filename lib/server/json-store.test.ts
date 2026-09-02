import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createRecord,
  emptyStore,
  listCollection,
  readStore,
  removeRecord,
  updateRecord,
} from "./json-store";

let dataDir = "";

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "jsonify-store-"));
  process.env.JSONIFY_DATA_DIR = dataDir;
});

afterEach(async () => {
  delete process.env.JSONIFY_DATA_DIR;
  await rm(dataDir, { recursive: true, force: true });
});

describe("json-store", () => {
  it("returns an empty store when the file does not exist", async () => {
    expect(await readStore()).toEqual(emptyStore());
  });

  it("returns an empty store when the file is malformed", async () => {
    await writeFile(path.join(dataDir, "jsonify.json"), "{ not json", "utf8");

    expect(await listCollection("collections")).toEqual([]);
  });

  it("creates a record with an id and timestamps and persists formatted JSON", async () => {
    const record = await createRecord("collections", { name: "Onboarding" });

    expect(record.id).toEqual(expect.any(String));
    expect(record.createdAt).toEqual(record.updatedAt);
    expect(await listCollection("collections")).toHaveLength(1);

    const raw = await readFile(path.join(dataDir, "jsonify.json"), "utf8");
    expect(raw.endsWith("\n")).toBe(true);
    expect(raw).toContain('\n  "collections"');
  });

  it("updates a record, refreshing updatedAt but keeping id and createdAt", async () => {
    const created = await createRecord("schemas", {
      name: "Profile",
      collectionId: "c1",
      schema: { type: "object" },
    });

    const updated = await updateRecord("schemas", created.id, {
      name: "Account",
      collectionId: "c1",
      schema: { type: "object" },
    });

    expect(updated?.id).toBe(created.id);
    expect(updated?.createdAt).toBe(created.createdAt);
    expect(updated?.name).toBe("Account");
  });

  it("returns null when updating an unknown id and does not create a file", async () => {
    expect(
      await updateRecord("collections", "missing", { name: "x" }),
    ).toBeNull();
    expect(await readStore()).toEqual(emptyStore());
  });

  it("removes a record and reports whether anything was deleted", async () => {
    const created = await createRecord("records", {
      name: "Entry",
      collectionId: "c1",
      schemaId: "s1",
      schemaName: "Customer",
      values: {},
    });

    expect(await removeRecord("records", "missing")).toBe(false);
    expect(await removeRecord("records", created.id)).toBe(true);
    expect(await listCollection("records")).toHaveLength(0);
  });

  it("serializes concurrent writes so no record is lost", async () => {
    await Promise.all([
      createRecord("collections", { name: "A" }),
      createRecord("collections", { name: "B" }),
      createRecord("collections", { name: "C" }),
    ]);

    const names = (await listCollection("collections"))
      .map((record) => record.name)
      .sort();
    expect(names).toEqual(["A", "B", "C"]);
  });
});
