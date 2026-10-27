"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useI18n } from "@/components/LanguageProvider";
import { CategoryTag, Chip, CrowdPill } from "@/components/map/bits";
import { CloseIcon, MapPinIcon, NavigationIcon, SearchIcon, WalkIcon } from "@/components/Icons";
import { NAIHATI_CENTER, formatDistance, nearestTo, roughWalkMinutes } from "@/lib/geo";
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

  const origin = geo.position ?? NAIHATI_CENTER;

  const list = useMemo(() => {
    const filtered = pandals.filter((pandal) => {
      if (category !== "all" && pandal.category !== category) return false;
      if (query.trim().length === 0) return true;
      return matchesQuery(pandalHaystack(pandal), query);
    });
    const withDist = nearestTo(filtered, origin);
    if (sort === "name") {
      return [...withDist].sort((a, b) =>
        lang === "bn" ? a.name_bn.localeCompare(b.name_bn) : a.name_en.localeCompare(b.name_en),
      );
    }
    return withDist;
  }, [pandals, category, query, sort, origin, lang]);

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-4 pb-28">
      <h1 className="text-[20px] font-bold text-white">
        {lang === "bn" ? "প্যান্ডেলের তালিকা" : "Pandal Directory"}
      </h1>
      <p className="mt-0.5 text-[12px] text-white/55">
        {lang === "bn"
          ? `${pandals.length}টি প্যান্ডেল — ঐতিহ্যবাহী, বড় ও ছোট`
          : `${pandals.length} pandals — heritage, large and small`}
      </p>

      {/* Search Input */}
      <div className="glass mt-3 flex h-11 items-center gap-2.5 rounded-2xl border border-white/10 px-3.5">
        <SearchIcon size={16} className="shrink-0 text-white/45" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-full w-full bg-transparent text-[13.5px] text-white placeholder:text-white/40 focus:outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="text-white/45 hover:text-white"
          >
            <CloseIcon size={14} />
          </button>
        ) : null}
      </div>

      {/* Category Chips */}
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

      {/* Sort & Count Bar */}
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[11.5px] text-white/50">
          {list.length} {t("navPandals")} ·{" "}
          {geo.position
            ? lang === "bn"
              ? "আপনার অবস্থান থেকে"
              : "from your location"
            : lang === "bn"
              ? "নৈহাটি স্টেশন থেকে"
              : "from Naihati Station"}
        </p>
        <div className="flex gap-1">
          <Chip active={sort === "distance"} onClick={() => setSort("distance")}>
            <MapPinIcon size={12} className="mr-1 inline stroke-current" />
            {lang === "bn" ? "দূরত্ব" : "Distance"}
          </Chip>
          <Chip active={sort === "name"} onClick={() => setSort("name")}>
            {lang === "bn" ? "নাম" : "Name"}
          </Chip>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="mt-3 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {list.map((pandal) => {
            const crowd = levels[pandal.slug] ?? pandal.crowd;
            const walkMin =
              typeof pandal.distance_m === "number"
                ? roughWalkMinutes(pandal.distance_m, crowd?.level ?? 1)
                : null;
            return (
              <li
                key={pandal.slug}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.07]"
              >
                <div className="flex items-start gap-3">
                  <img
                    src="/kali-pin.jpg"
                    alt=""
                    className="mt-0.5 size-10 shrink-0 rounded-full border border-gold/70 object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <CategoryTag category={pandal.category} lang={lang} />
                      {pandal.featured ? (
                        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">
                          {lang === "bn" ? "জনপ্রিয়" : "Popular"}
                        </span>
                      ) : null}
                    </div>

                    <Link
                      href={`/map?pandal=${pandal.slug}`}
                      className="mt-1 block truncate text-[14px] font-semibold text-white hover:text-gold"
                    >
                      {lang === "bn" ? pandal.name_bn : pandal.name_en}
                    </Link>

                    <p className="truncate text-[11px] text-white/55">
                      {lang === "bn" ? pandal.area_bn : pandal.area_en}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <CrowdPill info={crowd} lang={lang} size="sm" />
                  </div>
                </div>

                {/* Footer with Distance & Show Route */}
                <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2">
                  <div className="flex items-center gap-2 text-[12px] text-white/70">
                    {typeof pandal.distance_m === "number" ? (
                      <>
                        <span className="font-semibold text-gold">
                          {formatDistance(pandal.distance_m, lang)}
                        </span>
                        {walkMin ? (
                          <span className="flex items-center gap-0.5 text-white/50">
                            <WalkIcon size={12} className="stroke-white/50" />
                            <span>
                              ~{walkMin} {lang === "bn" ? "মিনিট" : "min"}
                            </span>
                          </span>
                        ) : null}
                      </>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/map?pandal=${pandal.slug}`}
                      className="liquid-press rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11.5px] text-white/80 hover:bg-white/10"
                    >
                      {lang === "bn" ? "ম্যাপে দেখুন" : "View Pin"}
                    </Link>
                    <Link
                      href={`/map?pandal=${pandal.slug}&route=1`}
                      className="liquid-press inline-flex items-center gap-1.5 rounded-xl bg-gold/15 px-3 py-1.5 text-[11.5px] font-semibold text-gold transition-colors hover:bg-gold hover:text-ink"
                    >
                      <NavigationIcon size={13} className="stroke-current" />
                      <span>{lang === "bn" ? "পথ দেখাও" : "Show Route"}</span>
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && list.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-white/55">
          {lang === "bn" ? "কোনো প্যান্ডেল পাওয়া যায়নি" : "Nothing matched your search"}
        </p>
      ) : null}
    </div>
  );
}
