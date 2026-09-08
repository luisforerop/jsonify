import { loadEnvFile } from "node:process";

import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next, so load the same env files Next would.
for (const file of [".env.local", ".env"]) {
  try {
    loadEnvFile(file);
  } catch {
    // file is optional
  }
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
