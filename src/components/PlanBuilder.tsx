"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useI18n } from "@/components/LanguageProvider";
import { CategoryTag, Chip } from "@/components/map/bits";
import {
  NAIHATI_CENTER,
  formatDistance,
  formatMinutes,
  haversine,
  orderByNearest,
  roughWalkMinutes,
} from "@/lib/geo";
import { useCopy, useCrowdLevels, useGeolocation, usePandals } from "@/lib/hooks";
import { matchesQuery, pandalHaystack } from "@/lib/search";
import type { Lang, Pandal } from "@/lib/types";
import {
  CheckCircleIcon,
  CloseIcon,
  CompassIcon,
  NavigationIcon,
  PlusIcon,
  SearchIcon,
  ShareIcon,
  SparklesIcon,
  TurnArrowIcon,
  WalkIcon,
} from "@/components/Icons";

function segmentDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return haversine(a, b) * 1.25;
}

/** Builds a pandal-hopping itinerary and hands it to the map as a live multi-stop route. */
export default function PlanBuilder() {
  const { lang, t } = useI18n();
  const { pandals, loading } = usePandals();
  const geo = useGeolocation(true);
  const { levels } = useCrowdLevels(useMemo(() => pandals.map((pandal) => pandal.slug), [pandals]));
  const [stops, setStops] = useState<Pandal[]>([]);
  const [query, setQuery] = useState("");
  const { copied, copy } = useCopy(2500);

  const origin = geo.position ?? NAIHATI_CENTER;

  const candidates = useMemo(() => {
    const chosen = new Set(stops.map((pandal) => pandal.slug));
    return pandals
      .filter((pandal) => !chosen.has(pandal.slug))
      .filter((pandal) => matchesQuery(pandalHaystack(pandal), query))
      .map((pandal) => ({ pandal, distance: haversine(origin, pandal) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 40);
  }, [pandals, stops, query, origin]);

  const totals = useMemo(() => {
    if (stops.length === 0) return { distance: 0, minutes: 0, legs: [] as number[] };
    let cursor: { lat: number; lng: number } = origin;
    let distance = 0;
    const legs: number[] = [];
    for (const stop of stops) {
      const leg = segmentDistance(cursor, stop);
      legs.push(leg);
      distance += leg;
      cursor = stop;
    }
    const averageCrowd =
      stops.reduce((sum, stop) => sum + (levels[stop.slug]?.level ?? 1), 0) / stops.length;
    return { distance, minutes: roughWalkMinutes(distance, Math.round(averageCrowd)), legs };
  }, [stops, origin, levels]);

  const addStop = (pandal: Pandal) => setStops((current) => [...current, pandal]);
  const removeStop = (slug: string) =>
    setStops((current) => current.filter((pandal) => pandal.slug !== slug));
  const move = (index: number, direction: -1 | 1) =>
    setStops((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const optimize = () => setStops((current) => orderByNearest(origin, current));

  const applyPreset = (preset: "heritage" | "nearest5" | "Featured") => {
    if (preset === "heritage") {
      const heritageList = pandals.filter((p) => p.category === "heritage").slice(0, 6);
      setStops(orderByNearest(origin, heritageList));
    } else if (preset === "nearest5") {
      const nearest5 = [...pandals]
        .sort((a, b) => haversine(origin, a) - haversine(origin, b))
        .slice(0, 5);
      setStops(orderByNearest(origin, nearest5));
    } else {
      const featuredList = pandals.filter((p) => p.featured).slice(0, 6);
      setStops(orderByNearest(origin, featuredList));
    }
  };

  const shareUrl =
    stops.length > 0 && typeof window !== "undefined"
      ? `${window.location.origin}/map?stops=${stops.map((stop) => stop.slug).join(",")}`
      : "";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-4 pb-28">
      <h1 className="text-[20px] font-bold text-white">{t("planTitle")}</h1>
      <p className="mt-0.5 text-[12px] text-white/55">
        {lang === "bn"
          ? "প্যান্ডেল বেছে নিন, ক্রম সাজান, তারপর ম্যাপে পুরো লাইভ রাস্তা দেখুন।"
          : "Pick your pandals, order the route, then open the whole live walk on the map."}
      </p>

      {/* 1-Tap Preset Parikrama Circuits */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-gold">
          <SparklesIcon size={13} />
          <span>{lang === "bn" ? "রেডি পরিক্রমা:" : "Quick Circuits:"}</span>
        </span>
        <Chip onClick={() => applyPreset("heritage")}>
          {lang === "bn" ? "ঐতিহ্যবাহী রুট (৬টি)" : "Heritage Circuit (6)"}
        </Chip>
        <Chip onClick={() => applyPreset("nearest5")}>
          {lang === "bn" ? "সবচেয়ে কাছের ৫টি" : "Nearest 5 Pandals"}
        </Chip>
        <Chip onClick={() => applyPreset("Featured")}>
          {lang === "bn" ? "জনপ্রিয় প্যান্ডেল" : "Popular Highlights"}
        </Chip>
      </div>

      {stops.length > 0 ? (
        <section className="glass mt-3 rounded-3xl border border-gold/25 p-3.5">
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-semibold text-white">
              {stops.length} {t("stops")}
            </p>
            <div className="text-right">
              <p className="text-[15px] font-bold text-gold">
                {formatDistance(totals.distance, lang)}
              </p>
              <p className="text-[11px] text-white/55">
                <span className="inline-flex items-center gap-1">
                  <WalkIcon size={12} className="stroke-white/55" />
                  {formatMinutes(totals.minutes, lang)}
                </span>
              </p>
            </div>
          </div>

          <ol className="mt-3 space-y-1.5">
            {stops.map((stop, index) => (
              <li
                key={stop.slug}
                className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.05] p-2.5"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gold/20 text-[11px] font-bold text-gold">
                  {index + 1}
                </span>
                <img
                  src="/kali-pin.jpg"
                  alt=""
                  className="size-8 shrink-0 rounded-full border border-gold/60 object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-white/90">
                    {lang === "bn" ? stop.name_bn : stop.name_en}
                  </p>
                  <p className="text-[11px] text-white/50">
                    {index === 0
                      ? formatDistance(totals.legs[0] ?? 0, lang)
                      : `${formatDistance(totals.legs[index] ?? 0, lang)} ${
                          lang === "bn" ? "আগের থেকে" : "from previous"
                        }`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    className="liquid-press grid size-7 place-items-center rounded-full border border-white/15 bg-white/5 text-white/75 hover:text-white"
                    aria-label="Move up"
                  >
                    <TurnArrowIcon size={12} direction="straight" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    className="liquid-press grid size-7 rotate-180 place-items-center rounded-full border border-white/15 bg-white/5 text-white/75 hover:text-white"
                    aria-label="Move down"
                  >
                    <TurnArrowIcon size={12} direction="straight" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStop(stop.slug)}
                    className="liquid-press grid size-7 place-items-center rounded-full border border-rose-400/30 bg-rose-500/15 text-rose-300"
                    aria-label={t("removeStop")}
                  >
                    <CloseIcon size={12} />
                  </button>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/map?stops=${stops.map((stop) => stop.slug).join(",")}`}
              className="liquid-press glow-gold flex-1 rounded-2xl bg-gold px-4 py-3 text-center text-[13.5px] font-bold text-ink"
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <NavigationIcon size={14} className="stroke-ink" />
                {t("openRouteInMap")}
              </span>
            </Link>
            <button
              type="button"
              onClick={optimize}
              className="liquid-press rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-[13px] font-medium"
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <CompassIcon size={14} className="stroke-white" />
                {t("optimizeOrder")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStops([])}
              className="liquid-press rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-[13px] font-medium"
            >
              {t("clearAll")}
            </button>
          </div>

          {shareUrl ? (
            <button
              type="button"
              onClick={() => copy(shareUrl)}
              className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-medium text-gold hover:underline"
            >
              {copied ? <CheckCircleIcon size={14} /> : <ShareIcon size={13} />}
              <span>
                {copied
                  ? t("copied")
                  : lang === "bn"
                    ? "এই পরিক্রমার লিঙ্ক কপি করুন"
                    : "Copy this parikrama link"}
              </span>
            </button>
          ) : null}
        </section>
      ) : (
        <p className="glass mt-3 rounded-2xl border border-white/10 px-3.5 py-3 text-[12.5px] text-white/70">
          {t("planEmpty")}
        </p>
      )}

      {/* Search & Add Pandals */}
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

      {loading ? (
        <p className="py-8 text-center text-[13px] text-white/60">{t("loading")}</p>
      ) : (
        <ul className="mt-2.5 space-y-2">
          {candidates.map(({ pandal, distance }) => (
            <li
              key={pandal.slug}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
            >
              <img
                src="/kali-pin.jpg"
                alt=""
                className="size-9 shrink-0 rounded-full border border-gold/60 object-cover"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <CategoryTag category={pandal.category} lang={lang} />
                <p className="mt-1 truncate text-[13.5px] font-semibold text-white/90">
                  {lang === "bn" ? pandal.name_bn : pandal.name_en}
                </p>
                <p className="truncate text-[11px] text-white/50">
                  {lang === "bn" ? pandal.area_bn : pandal.area_en} ·{" "}
                  {formatDistance(distance, lang)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => addStop(pandal)}
                className="liquid-press inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/35 bg-gold/15 px-3 py-1.5 text-[12px] font-semibold text-gold hover:bg-gold hover:text-ink"
              >
                <PlusIcon size={13} />
                <span>{t("addStop")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function planSummary(stops: Pandal[], lang: Lang, origin = NAIHATI_CENTER): string {
  const distance = stops.reduce(
    (sum, stop, index) => sum + segmentDistance(index === 0 ? origin : stops[index - 1], stop),
    0,
  );
  return `${stops.length} ${lang === "bn" ? "স্টপ" : "stops"} · ${formatDistance(distance, lang)}`;
}
