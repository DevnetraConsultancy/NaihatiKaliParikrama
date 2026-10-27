#!/usr/bin/env node
/**
 * Applies the NaihatiKaliParikrama schema to the Neon database in DATABASE_URL.
 * Safe to run repeatedly — every statement is idempotent.
 *
 *   npm run db:migrate
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { SCHEMA_SQL } from "../src/lib/schema.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

function loadEnvFile(name) {
  const path = resolve(root, name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "DATABASE_URL is not set.\n" +
      "Add it to .env.local (Neon → Connect → pooled connection string) and run again,\n" +
      "or copy the schema into the Neon SQL editor with: node scripts/print-schema.mjs",
  );
  process.exit(1);
}

const sql = neon(connectionString);
const statements = SCHEMA_SQL.split(";")
  .map((statement) => statement.trim())
  .filter((statement) => statement.length > 0);

console.log(`Applying ${statements.length} statements…`);
for (const statement of statements) {
  const label = statement.slice(0, 60).replace(/\s+/g, " ");
  await sql.query(statement);
  console.log(`  ✓ ${label}…`);
}
console.log("Schema ready. Next: npm run db:seed");
