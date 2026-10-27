#!/usr/bin/env node
/**
 * Loads the bundled pandal list and verified facility landmarks into Neon.
 * Existing pandals keep their local edits (insert … on conflict do nothing);
 * facilities are refreshed from src/data/facilities.seed.json.
 *
 *   npm run db:seed
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

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
  console.error("DATABASE_URL is not set (add it to .env.local first).");
  process.exit(1);
}

const pandals = JSON.parse(readFileSync(resolve(root, "src/data/pandals.seed.json"), "utf8")).pandals ?? [];
const facilities =
  JSON.parse(readFileSync(resolve(root, "src/data/facilities.seed.json"), "utf8")).facilities ?? [];

const sql = neon(connectionString);

let insertedPandals = 0;
for (const pandal of pandals) {
  const rows = await sql.query(
    `insert into pandals (slug, name_en, name_bn, category, area_en, area_bn, lat, lng,
       landmark_en, landmark_bn, committee, established, description_en, description_bn, featured, verified)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     on conflict (slug) do nothing
     returning slug`,
    [
      pandal.slug,
      pandal.name_en,
      pandal.name_bn,
      pandal.category,
      pandal.area_en ?? "",
      pandal.area_bn ?? "",
      pandal.lat,
      pandal.lng,
      pandal.landmark_en ?? null,
      pandal.landmark_bn ?? null,
      pandal.committee ?? null,
      pandal.established ?? null,
      pandal.description_en ?? null,
      pandal.description_bn ?? null,
      Boolean(pandal.featured),
      Boolean(pandal.verified),
    ],
  );
  insertedPandals += rows.length;
}

let insertedFacilities = 0;
for (const facility of facilities) {
  const osmId = facility.osm_id ?? `manual/${facility.kind}/${facility.name}`;
  await sql.query(
    `insert into facilities (osm_id, kind, name, lat, lng, address, phone, source, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8, now())
     on conflict (osm_id) do update set
       name = excluded.name, lat = excluded.lat, lng = excluded.lng,
       address = excluded.address, phone = excluded.phone, updated_at = now()`,
    [
      osmId,
      facility.kind,
      facility.name,
      facility.lat,
      facility.lng,
      facility.address ?? null,
      facility.phone ?? null,
      facility.source ?? "seed",
    ],
  );
  insertedFacilities += 1;
}

const [{ count: pandalCount }] = await sql.query("select count(*)::int as count from pandals");
const [{ count: facilityCount }] = await sql.query("select count(*)::int as count from facilities");

console.log(
  `Seeded ${insertedPandals} new pandals and refreshed ${insertedFacilities} facilities.\n` +
    `Totals now: ${pandalCount} pandals, ${facilityCount} facilities.`,
);
