"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useI18n } from "@/components/LanguageProvider";
import { CategoryTag, Chip, CrowdPill } from "@/components/map/bits";
import { formatDistance, formatMinutes, nearestTo, roughWalkMinutes } from "@/lib/geo";
import { matchesQuery, pandalHaystack } from "@/lib/search";
import { useCrowdLevels, useGeolocation, usePandals } from "@/lib/hooks";
import { PANDAL_CATEGORIES, type PandalCategory } from "@/lib/types";

/** Searchable, filterable pandal directory with live distance and crowd. */
export default function PandalsExplorer() {
  const { lang, t } = useI18n();
  const { pandals, loading } = usePandals();
  const geo = useGeolocation(true);
  const { levels } = useCrowdLevels(useMemo(() => pandals.map((p) => p.slug), [pandals]));
  const [category, setCategory] = useState<PandalCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"distance" | "name">("distance");

  const list = useMemo(() => {
    const filtered = pandals.filter((pandal) => {
      if (category !== "all" && pandal.category !== category) return false;
      if (query.trim().length === 0) return true;
      return matchesQuery(pandalHaystack(pandal), query);
    });
    if (sort === "name" || !geo.position) {
      return filtered.map((pandal) => ({ ...pandal, distance_m: undefined as number | undefined }));
    }
    return nearestTo(filtered, geo.position);
  }, [pandals, category, query, sort, geo.position]);

  return (
    <div className="mx-auto w-full max-w-2xl px-3 pt-4 pb-28">
      <h1 className="text-[21px] font-bold text-white">
        {lang === "bn" ? "প্যান্ডেলের তালিকা" : "Pandal directory"}
      </h1>
      <p className="mt-1 text-[12.5px] text-white/60">
        {lang === "bn"
          ? `${pandals.length}টি প্যান্ডেল — ঐতিহ্যবাহী, বড় ও ছোট`
          : `${pandals.length} pandals — heritage, large and small`}
      </p>

      <div className="glass mt-3 flex h-11 items-center gap-2 rounded-2xl px-3">
        <span className="opacity-70">🔍</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-full w-full bg-transparent text-[14px] placeholder:text-white/40 focus:outline-none"
        />
      </div>

      <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <Chip active={category === "all"} onClick={() => setCategory("all")}>
          {t("showAll")} · {pandals.length}
        </Chip>
        {PANDAL_CATEGORIES.map((item) => (
          <Chip
            key={item}
            active={category === item}
            onClick={() => setCategory(item)}
            color={
              item === "heritage"
                ? "var(--color-heritage)"
                : item === "large"
                  ? "var(--color-large)"
                  : "var(--color-small)"
            }
          >
            {t(item)} · {pandals.filter((pandal) => pandal.category === item).length}
          </Chip>
        ))}
      </div>

      <div className="mt-1 flex items-center justify-between">
        <p className="text-[11.5px] text-white/50">
          {list.length} {t("navPandals")}
          {geo.position && sort === "distance"
            ? ` · ${lang === "bn" ? "আপনার থেকে দূরত্ব অনুযায়ী" : "nearest first"}`
            : ""}
        </p>
        <div className="flex gap-1.5">
          <Chip active={sort === "distance"} onClick={() => setSort("distance")}>
            📍 {lang === "bn" ? "দূরত্ব" : "Distance"}
          </Chip>
          <Chip active={sort === "name"} onClick={() => setSort("name")}>
            🔤 {lang === "bn" ? "নাম" : "Name"}
          </Chip>
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-[13px] text-white/60">{t("loading")}</p>
      ) : (
        <ul className="mt-2.5 space-y-2">
          {list.map((pandal) => (
            <li key={pandal.slug}>
              <Link
                href={`/map?pandal=${pandal.slug}`}
                className="liquid-card block rounded-2xl border border-white/10 bg-white/[0.04] p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryTag category={pandal.category} lang={lang} />
                      {pandal.featured ? (
                        <span className="text-[10.5px] font-semibold text-gold">
                          {lang === "bn" ? "জনপ্রিয়" : "Popular"}
                        </span>
                      ) : null}
                      {pandal.verified === false ? (
                        <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/50">
                          {t("approximatePin")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-[15px] font-semibold text-white">
                      {lang === "bn" ? pandal.name_bn : pandal.name_en}
                    </p>
                    <p className="text-[12px] text-white/55">
                      {lang === "bn" ? pandal.area_bn : pandal.area_en}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {typeof pandal.distance_m === "number" ? (
                      <>
                        <span className="text-[13px] font-semibold text-gold">
                          {formatDistance(pandal.distance_m, lang)}
                        </span>
                        <span className="text-[11px] text-white/55">
                          🚶{" "}
                          {formatMinutes(
                            roughWalkMinutes(
                              pandal.distance_m,
                              levels[pandal.slug]?.level ?? 1,
                            ),
                            lang,
                          )}
                        </span>
                      </>
                    ) : null}
                    <CrowdPill info={levels[pandal.slug]} lang={lang} size="sm" />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!loading && list.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-white/55">
          {lang === "bn" ? "কিছু পাওয়া যায়নি" : "Nothing matched your search"}
        </p>
      ) : null}
    </div>
  );
}
