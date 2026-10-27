import seedPandalsJson from "@/data/pandals.seed.json";
import seedFacilitiesJson from "@/data/facilities.seed.json";
import { getSql, hasDatabase } from "./db";
import { blendCrowd, baselineLevel, type CrowdLevel, type CrowdReport } from "./crowd";
import { bboxAround, haversine } from "./geo";
import type { CrowdInfo, Facility, Pandal } from "./types";

interface SeedFile<T> {
  pandals?: T[];
  facilities?: T[];
}

const seedPandals = ((seedPandalsJson as unknown as SeedFile<Pandal>).pandals ?? []).sort((a, b) =>
  a.name_en.localeCompare(b.name_en),
);

const seedFacilities = (
  (seedFacilitiesJson as unknown as SeedFile<Facility>).facilities ?? []
) as Facility[];

/** Pandals shipped with the repository, used when there is no database. */
export function bundledPandals(): Pandal[] {
  return seedPandals.map((pandal) => ({ ...pandal }));
}

export function bundledFacilities(): Facility[] {
  return seedFacilities.map((facility) => ({ ...facility }));
}

const PANDAL_COLUMNS = `slug, name_en, name_bn, category, area_en, area_bn, lat, lng,
  landmark_en, landmark_bn, committee, established, description_en, description_bn,
  featured, verified, photo_url, created_at, updated_at`;

export async function listPandals(): Promise<{ pandals: Pandal[]; source: "database" | "seed" }> {
  if (!hasDatabase()) return { pandals: bundledPandals(), source: "seed" };
  try {
    const sql = getSql();
    const rows = (await sql.query(`select ${PANDAL_COLUMNS} from pandals order by name_en asc`)) as
      | Pandal[]
      | { rows?: Pandal[] };
    const pandals = Array.isArray(rows) ? rows : (rows.rows ?? []);
    if (pandals.length === 0) return { pandals: bundledPandals(), source: "seed" };
    return { pandals, source: "database" };
  } catch (error) {
    console.error("[repo] listPandals failed:", (error as Error).message);
    return { pandals: bundledPandals(), source: "seed" };
  }
}

export interface PandalInput {
  slug: string;
  name_en: string;
  name_bn: string;
  category: string;
  area_en: string;
  area_bn: string;
  lat: number;
  lng: number;
  landmark_en?: string | null;
  landmark_bn?: string | null;
  committee?: string | null;
  established?: number | null;
  description_en?: string | null;
  description_bn?: string | null;
  featured?: boolean;
  verified?: boolean;
}

export async function upsertPandal(input: PandalInput): Promise<Pandal> {
  const sql = getSql();
  const rows = (await sql.query(
    `insert into pandals (slug, name_en, name_bn, category, area_en, area_bn, lat, lng,
       landmark_en, landmark_bn, committee, established, description_en, description_bn,
       featured, verified, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, now())
     on conflict (slug) do update set
       name_en = excluded.name_en, name_bn = excluded.name_bn, category = excluded.category,
       area_en = excluded.area_en, area_bn = excluded.area_bn, lat = excluded.lat, lng = excluded.lng,
       landmark_en = excluded.landmark_en, landmark_bn = excluded.landmark_bn,
       committee = excluded.committee, established = excluded.established,
       description_en = excluded.description_en, description_bn = excluded.description_bn,
       featured = excluded.featured, verified = excluded.verified, updated_at = now()
     returning ${PANDAL_COLUMNS}`,
    [
      input.slug,
      input.name_en,
      input.name_bn,
      input.category,
      input.area_en ?? "",
      input.area_bn ?? "",
      input.lat,
      input.lng,
      input.landmark_en ?? null,
      input.landmark_bn ?? null,
      input.committee ?? null,
      input.established ?? null,
      input.description_en ?? null,
      input.description_bn ?? null,
      Boolean(input.featured),
      Boolean(input.verified),
    ],
  )) as Pandal[] | { rows?: Pandal[] };
  const list = Array.isArray(rows) ? rows : (rows.rows ?? []);
  return list[0];
}

export async function deletePandal(slug: string): Promise<boolean> {
  const sql = getSql();
  await sql.query("delete from pandals where slug = $1", [slug]);
  return true;
}

export async function replaceAllPandals(inputs: PandalInput[]): Promise<number> {
  const sql = getSql();
  for (const input of inputs) {
    await sql.query(
      `insert into pandals (slug, name_en, name_bn, category, area_en, area_bn, lat, lng,
         landmark_en, landmark_bn, committee, established, description_en, description_bn,
         featured, verified)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       on conflict (slug) do nothing`,
      [
        input.slug,
        input.name_en,
        input.name_bn,
        input.category,
        input.area_en ?? "",
        input.area_bn ?? "",
        input.lat,
        input.lng,
        input.landmark_en ?? null,
        input.landmark_bn ?? null,
        input.committee ?? null,
        input.established ?? null,
        input.description_en ?? null,
        input.description_bn ?? null,
        Boolean(input.featured),
        Boolean(input.verified),
      ],
    );
  }
  return inputs.length;
}

// ---------------------------------------------------------------------------
// Crowd levels
// ---------------------------------------------------------------------------

interface MemoryStore {
  reports: Map<string, CrowdReport[]>;
  reporters: Map<string, number>;
}

// Survives dev-server hot reloads and is shared by every route in the process.
const globalStore = globalThis as unknown as { __nkpCrowd?: MemoryStore };
const memory: MemoryStore =
  globalStore.__nkpCrowd ??
  (globalStore.__nkpCrowd = { reports: new Map<string, CrowdReport[]>(), reporters: new Map() });

function memoryReportsFor(slug: string): CrowdReport[] {
  const reports = memory.reports.get(slug) ?? [];
  const cutoff = Date.now() - 3 * 60 * 60 * 1000;
  const fresh = reports.filter((report) => report.createdAt >= cutoff);
  memory.reports.set(slug, fresh);
  return fresh;
}

export interface CrowdMap {
  levels: Record<string, CrowdInfo>;
  source: "database" | "memory";
}

export async function getCrowdLevels(slugs: string[]): Promise<CrowdMap> {
  const unique = [...new Set(slugs.filter(Boolean))];
  if (unique.length === 0) return { levels: {}, source: "memory" };

  if (!hasDatabase()) {
    return { levels: buildMemoryLevels(unique), source: "memory" };
  }

  try {
    const sql = getSql();
    const rows = (await sql.query(
      `select pandal_slug, level, extract(epoch from created_at) * 1000 as created_ms
       from crowd_reports
       where created_at > now() - interval '3 hours'`,
    )) as { pandal_slug: string; level: number; created_ms: string }[];

    const grouped = new Map<string, CrowdReport[]>();
    for (const row of rows) {
      const list = grouped.get(row.pandal_slug) ?? [];
      list.push({ level: Number(row.level), createdAt: Number(row.created_ms) });
      grouped.set(row.pandal_slug, list);
    }
    const levels: Record<string, CrowdInfo> = {};
    for (const slug of unique) {
      levels[slug] = blendCrowd(grouped.get(slug) ?? [], slug);
    }
    return { levels, source: "database" };
  } catch (error) {
    console.error("[repo] getCrowdLevels failed:", (error as Error).message);
    return { levels: buildMemoryLevels(unique), source: "memory" };
  }
}

function buildMemoryLevels(slugs: string[]): Record<string, CrowdInfo> {
  const levels: Record<string, CrowdInfo> = {};
  for (const slug of slugs) {
    levels[slug] = blendCrowd(memoryReportsFor(slug), slug);
  }
  return levels;
}

export interface RecordReportResult {
  ok: boolean;
  reason?: "rate-limited" | "not-persisted";
  persisted: boolean;
  info?: CrowdInfo;
}

const REPORT_COOLDOWN_MS = 20 * 60 * 1000;

export async function recordCrowdReport(
  slug: string,
  level: CrowdLevel,
  reporterHash: string,
): Promise<RecordReportResult> {
  const cooldownKey = `${slug}:${reporterHash}`;
  const lastReport = memory.reporters.get(cooldownKey) ?? 0;
  if (Date.now() - lastReport < REPORT_COOLDOWN_MS) {
    return { ok: false, reason: "rate-limited", persisted: false };
  }

  if (hasDatabase()) {
    try {
      const sql = getSql();
      const recent = (await sql.query(
        `select id from crowd_reports
         where pandal_slug = $1 and reporter_hash = $2 and created_at > now() - interval '20 minutes'
         limit 1`,
        [slug, reporterHash],
      )) as { id: number }[];
      if (recent.length > 0) {
        memory.reporters.set(cooldownKey, Date.now());
        return { ok: false, reason: "rate-limited", persisted: true };
      }
      await sql.query(
        "insert into crowd_reports (pandal_slug, level, source, reporter_hash) values ($1,$2,$3,$4)",
        [slug, level, "user", reporterHash],
      );
      memory.reporters.set(cooldownKey, Date.now());
      const reports = memoryReportsFor(slug);
      reports.push({ level, createdAt: Date.now() });
      memory.reports.set(slug, reports);
      return { ok: true, persisted: true, info: blendCrowd(reports, slug) };
    } catch (error) {
      console.error("[repo] recordCrowdReport failed:", (error as Error).message);
    }
  }

  const reports = memoryReportsFor(slug);
  reports.push({ level, createdAt: Date.now() });
  memory.reports.set(slug, reports);
  memory.reporters.set(cooldownKey, Date.now());
  return {
    ok: true,
    persisted: false,
    reason: hasDatabase() ? undefined : "not-persisted",
    info: blendCrowd(reports, slug),
  };
}

export function baselineForNow(): CrowdLevel {
  return baselineLevel();
}

// ---------------------------------------------------------------------------
// Facilities (OpenStreetMap cache)
// ---------------------------------------------------------------------------

const FACILITY_FRESH_DAYS = 14;
/** Below this many cached rows we treat the cache as thin and refresh from OSM. */
const FACILITY_CACHE_MINIMUM = 6;

export async function cachedFacilities(
  lat: number,
  lng: number,
  radius: number,
  kinds: string[],
): Promise<Facility[]> {
  if (!hasDatabase()) return [];
  const bounds = bboxAround(lat, lng, radius);
  try {
    const sql = getSql();
    const rows = (await sql.query(
      `select osm_id, kind, name, lat, lng, address, phone, source
       from facilities
       where lat between $1 and $2
         and lng between $3 and $4
         and kind in (${kinds.map((_, index) => `$${index + 5}`).join(", ")})
         and updated_at > now() - interval '${FACILITY_FRESH_DAYS} days'
       limit 400`,
      [bounds.south, bounds.north, bounds.west, bounds.east, ...kinds],
    )) as Facility[];
    return rows;
  } catch (error) {
    console.error("[repo] cachedFacilities failed:", (error as Error).message);
    return [];
  }
}

export function facilityCacheIsThin(rows: Facility[]): boolean {
  return rows.length < FACILITY_CACHE_MINIMUM;
}

export async function storeFacilities(facilities: Facility[]): Promise<void> {
  if (!hasDatabase() || facilities.length === 0) return;
  try {
    const sql = getSql();
    for (const facility of facilities.slice(0, 300)) {
      await sql.query(
        `insert into facilities (osm_id, kind, name, lat, lng, address, phone, source, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8, now())
         on conflict (osm_id) do update set
           name = excluded.name, lat = excluded.lat, lng = excluded.lng,
           address = excluded.address, phone = excluded.phone, updated_at = now()`,
        [
          facility.osm_id ?? `manual/${facility.kind}/${facility.name}`,
          facility.kind,
          facility.name,
          facility.lat,
          facility.lng,
          facility.address ?? null,
          facility.phone ?? null,
          facility.source ?? "osm",
        ],
      );
    }
  } catch (error) {
    console.error("[repo] storeFacilities failed:", (error as Error).message);
  }
}

export async function countRows(table: "pandals" | "crowd_reports" | "facilities"): Promise<number> {
  if (!hasDatabase()) return 0;
  try {
    const sql = getSql();
    const rows = (await sql.query(`select count(*)::int as count from ${table}`)) as {
      count: number;
    }[];
    return rows[0]?.count ?? 0;
  } catch {
    return 0;
  }
}
