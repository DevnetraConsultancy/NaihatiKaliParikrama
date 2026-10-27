import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { areaLevel } from "@/lib/crowd";
import type { CrowdLevel } from "@/lib/crowd";
import { isSameOrigin } from "@/lib/auth";
import { getCrowdLevels, listPandals, recordCrowdReport } from "@/lib/repo";

export const dynamic = "force-dynamic";

/** Crowd levels for the requested pandals (live reports blended with the clock). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const slugs = (url.searchParams.get("slugs") ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean)
    .slice(0, 200);

  if (slugs.length === 0) {
    return NextResponse.json({ levels: {}, area: null });
  }

  const { levels, source } = await getCrowdLevels(slugs);
  const area = areaLevel(
    Object.values(levels).filter((info) => info !== undefined),
    "en",
  );

  return NextResponse.json({
    levels,
    area: { level: area.level, label: area.label },
    source,
    time: new Date().toISOString(),
  });
}

interface ReportBody {
  slug?: string;
  level?: number;
}

/**
 * A visitor's "how crowded is it here?" check-in. Reports are anonymised (the
 * IP address is hashed, never stored) and limited to one per pandal per
 * 20 minutes per device.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "forbidden-origin" }, { status: 403 });
  }

  let body: ReportBody;
  try {
    body = (await request.json()) as ReportBody;
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const level = Number(body.level);
  const slug = typeof body.slug === "string" ? body.slug : "";

  if (!slug || !Number.isInteger(level) || level < 1 || level > 4) {
    return NextResponse.json({ error: "invalid-report" }, { status: 400 });
  }

  const { pandals } = await listPandals();
  if (!pandals.some((pandal) => pandal.slug === slug)) {
    return NextResponse.json({ error: "unknown-pandal" }, { status: 404 });
  }

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  const agent = request.headers.get("user-agent") ?? "";
  const reporterHash = createHash("sha256")
    .update(`${ip}|${agent}|naihati-kali-parikrama`)
    .digest("hex")
    .slice(0, 24);

  const result = await recordCrowdReport(slug, level as CrowdLevel, reporterHash);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason ?? "failed", persisted: result.persisted },
      { status: result.reason === "rate-limited" ? 429 : 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    persisted: result.persisted,
    info: result.info,
    note: result.persisted ? undefined : "stored-in-memory-only",
  });
}
