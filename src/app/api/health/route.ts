import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { countRows, listPandals } from "@/lib/repo";

export const dynamic = "force-dynamic";

/** Deployment probe: shows whether Neon is wired up and how much data exists. */
export async function GET() {
  const { pandals, source } = await listPandals();
  return NextResponse.json({
    ok: true,
    app: "NaihatiKaliParikrama",
    database: hasDatabase(),
    pandalSource: source,
    pandalCount: pandals.length,
    crowdReports: hasDatabase() ? await countRows("crowd_reports") : 0,
    facilities: hasDatabase() ? await countRows("facilities") : 0,
    adminConfigured: (process.env.ADMIN_PASSWORD ?? "").length >= 6,
    time: new Date().toISOString(),
  });
}
