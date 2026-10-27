import { NextResponse } from "next/server";
import { isAdminRequest, isSameOrigin } from "@/lib/auth";
import { hasDatabase } from "@/lib/db";
import { deletePandal, listPandals, upsertPandal, type PandalInput } from "@/lib/repo";
import { PANDAL_CATEGORIES, type PandalCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{2,79}$/;

function validate(body: unknown): { ok: true; value: PandalInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "invalid-body" };
  const raw = body as Record<string, unknown>;

  const text = (key: string, required = false): string | null => {
    const value = raw[key];
    if (value === undefined || value === null || value === "") {
      return required ? null : null;
    }
    if (typeof value !== "string") return null;
    return value.trim().slice(0, 2000);
  };

  const slug = (text("slug") ?? "").toLowerCase().replace(/\s+/g, "-");
  if (!SLUG_PATTERN.test(slug)) return { ok: false, error: "invalid-slug" };

  const nameEn = text("name_en", true);
  if (!nameEn) return { ok: false, error: "name-en-required" };

  const category = text("category") as PandalCategory | null;
  if (!category || !PANDAL_CATEGORIES.includes(category)) {
    return { ok: false, error: "invalid-category" };
  }

  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  // Reject coordinates far outside West Bengal — the usual cause is swapped
  // latitude and longitude, or a decimal typo.
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 20 || lat > 28 || lng < 85 || lng > 91) {
    return { ok: false, error: "coordinates-out-of-range" };
  }

  const establishedRaw = Number(raw.established);
  const established =
    Number.isInteger(establishedRaw) && establishedRaw > 1800 && establishedRaw < 2200
      ? establishedRaw
      : null;

  return {
    ok: true,
    value: {
      slug,
      name_en: nameEn,
      name_bn: text("name_bn") ?? nameEn,
      category,
      area_en: text("area_en") ?? "",
      area_bn: text("area_bn") ?? "",
      lat,
      lng,
      landmark_en: text("landmark_en"),
      landmark_bn: text("landmark_bn"),
      committee: text("committee"),
      established,
      description_en: text("description_en"),
      description_bn: text("description_bn"),
      featured: Boolean(raw.featured),
      verified: Boolean(raw.verified),
    },
  };
}

/** Admin listing — includes the database state so the UI can offer setup. */
export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { pandals, source } = await listPandals();
  return NextResponse.json({ pandals, source, database: hasDatabase() });
}

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const parsed = validate(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const pandal = await upsertPandal(parsed.value);
    return NextResponse.json({ ok: true, pandal });
  } catch (error) {
    return NextResponse.json(
      { error: "save-failed", detail: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (hasDatabase() === false) {
    return NextResponse.json({ error: "database-not-configured" }, { status: 503 });
  }

  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  if (!SLUG_PATTERN.test(slug)) {
    return NextResponse.json({ error: "invalid-slug" }, { status: 400 });
  }

  try {
    await deletePandal(slug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "delete-failed", detail: (error as Error).message },
      { status: 500 },
    );
  }
}
