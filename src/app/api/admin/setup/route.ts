import { NextResponse } from "next/server";
import { isAdminRequest, isSameOrigin } from "@/lib/auth";
import { getSql, hasDatabase } from "@/lib/db";
import { bundledFacilities, bundledPandals, countRows, replaceAllPandals, storeFacilities } from "@/lib/repo";
import { SCHEMA_SQL } from "@/lib/schema";

export const dynamic = "force-dynamic";

/**
 * One-click database preparation for a fresh Neon project: applies the schema
 * and loads the bundled pandal and facility data. Safe to run again — every
 * statement is idempotent and seeded pandals are inserted only if missing.
 */
export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "forbidden-origin" }, { status: 403 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: "database-not-configured" }, { status: 503 });
  }

  const sql = getSql();
  try {
    for (const statement of SCHEMA_SQL.split(";")) {
      const trimmed = statement.trim();
      if (trimmed.length === 0) continue;
      await sql.query(trimmed);
    }
  } catch (error) {
    return NextResponse.json(
      { error: "schema-failed", detail: (error as Error).message },
      { status: 500 },
    );
  }

  let seededPandals = 0;
  let seededFacilities = 0;

  try {
    if ((await countRows("pandals")) === 0) {
      seededPandals = await replaceAllPandals(bundledPandals());
    }
    if ((await countRows("facilities")) === 0) {
      const facilities = bundledFacilities();
      await storeFacilities(facilities);
      seededFacilities = facilities.length;
    }
  } catch (error) {
    return NextResponse.json(
      { error: "seed-failed", detail: (error as Error).message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    pandals: await countRows("pandals"),
    facilities: await countRows("facilities"),
    seededPandals,
    seededFacilities,
  });
}
