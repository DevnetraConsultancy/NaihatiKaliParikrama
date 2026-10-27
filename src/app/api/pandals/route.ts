import { NextResponse } from "next/server";
import { nearestTo } from "@/lib/geo";
import { bundledPandals, getCrowdLevels, listPandals } from "@/lib/repo";
import { matchesQuery, pandalHaystack } from "@/lib/search";
import type { CrowdInfo, Pandal } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Pandal directory. Runs database and crowd queries in parallel with in-memory
 * caching so responses return in milliseconds.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const near = url.searchParams.get("near");
  const limit = Number(url.searchParams.get("limit") ?? "0");

  const defaultSlugs = bundledPandals().map((p) => p.slug);

  const [{ pandals, source }, crowdResult] = await Promise.all([
    listPandals(),
    getCrowdLevels(defaultSlugs).catch(() => ({ levels: {} as Record<string, CrowdInfo>, source: "memory" as const })),
  ]);

  let result: Pandal[] = pandals;

  if (category && category !== "all") {
    result = result.filter((pandal) => pandal.category === category);
  }

  if (query.length > 0) {
    result = result.filter((pandal) => matchesQuery(pandalHaystack(pandal), query));
  }

  let withDistance: (Pandal & { distance_m?: number })[] = result.map((pandal) => ({ ...pandal }));

  if (near) {
    const [lat, lng] = near.split(",").map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      withDistance = nearestTo(result, { lat, lng });
    }
  }

  const limited = limit > 0 ? withDistance.slice(0, limit) : withDistance;
  const levels = crowdResult.levels;

  const pandalsWithCrowd = limited.map((pandal) => ({
    ...pandal,
    crowd: levels[pandal.slug],
  }));

  return NextResponse.json(
    {
      pandals: pandalsWithCrowd,
      source,
      count: pandalsWithCrowd.length,
      total: pandals.length,
      time: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=60",
      },
    },
  );
}
