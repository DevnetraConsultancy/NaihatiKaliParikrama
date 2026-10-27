"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useI18n } from "@/components/LanguageProvider";
import { CategoryTag, CrowdPill } from "@/components/map/bits";
import {
  CompassIcon,
  CrosshairIcon,
  MapIcon,
  MapPinIcon,
  NavigationIcon,
  ShieldAlertIcon,
  TempleIcon,
  WalkIcon,
} from "@/components/Icons";
import { useCrowdLevels, useGeolocation, usePandals } from "@/lib/hooks";
import { formatDistance, haversine, NAIHATI_CENTER, walkMinutes } from "@/lib/geo";
import { PANDAL_CATEGORIES, type PandalWithDistance } from "@/lib/types";
import { AnimatedDiya } from "@/components/FestiveDecorations";

export default function HomeContent() {
  const { lang, t } = useI18n();
  const { pandals, loading } = usePandals();
  const geo = useGeolocation(true);
  const { levels } = useCrowdLevels(useMemo(() => pandals.map((p) => p.slug), [pandals]));

  const userPosition = geo.position;
  const referencePoint = userPosition ?? NAIHATI_CENTER;

  // Compute live distances for all pandals
  const sortedPandals = useMemo<PandalWithDistance[]>(() => {
    return pandals
      .map((pandal) => {
        const distance_m = Math.round(
          haversine(referencePoint, { lat: pandal.lat, lng: pandal.lng }),
        );
        return {
          ...pandal,
          distance_m,
          crowd: levels[pandal.slug],
        };
      })
      .sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0));
  }, [pandals, referencePoint, levels]);

  const nearestPandals = sortedPandals.slice(0, 5);

  const categoryCounts = useMemo(() => {
    return PANDAL_CATEGORIES.reduce<Record<string, number>>((acc, category) => {
      acc[category] = pandals.filter((p) => p.category === category).length;
      return acc;
    }, {});
  }, [pandals]);

  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-4 pb-28">
      {/* -------------------- Hero & Boro Maa Emblem -------------------- */}
      <section className="relative overflow-hidden rounded-3xl border border-gold/25 bg-gradient-to-b from-white/[0.07] via-white/[0.03] to-transparent p-5 text-center shadow-xl shadow-black/40">
        <div
          className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 size-48 rounded-full opacity-35 blur-3xl"
          style={{ background: "radial-gradient(circle, #f5c76a 0%, transparent 70%)" }}
        />

        <div className="relative mx-auto flex items-center justify-center gap-3.5">
          <div className="hidden xs:block opacity-90"><AnimatedDiya size={32} glow /></div>
          <div className="relative size-28 shrink-0 overflow-hidden rounded-full border-2 border-gold/80 shadow-[0_0_28px_rgba(245,199,106,0.5)]">
            <Image
              src="/boro-maa-emblem.png"
              alt="Naihati Boro Maa"
              width={112}
              height={112}
              className="size-full object-cover"
              priority
            />
          </div>
          <div className="hidden xs:block opacity-90"><AnimatedDiya size={32} glow /></div>
        </div>

        <h1 className="bengali-gradient-text bn-text mt-3.5 text-[22px] font-bold tracking-tight">
          {lang === "bn" ? "নৈহাটি কালীপূজা পরিক্রমা" : "Naihati Kali Puja Parikrama"}
        </h1>
        <p className="text-[12.5px] text-white/60">
          {lang === "bn"
            ? "লাইভ ম্যাপ · কাছের প্যান্ডেল · হাঁটার পথ ও সময়"
            : "Live Map · Nearest Pandals · Walking Routes & ETAs"}
        </p>

        {/* Action Shortcuts */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Link
            href="/map"
            className="liquid-press flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-gold py-2.5 px-2 text-ink shadow-md transition-transform hover:scale-[1.02]"
          >
            <MapIcon size={18} className="stroke-ink" />
            <span className="text-[12px] font-bold">{lang === "bn" ? "লাইভ ম্যাপ" : "Live Map"}</span>
          </Link>
          <Link
            href="/pandals"
            className="liquid-press flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/5 py-2.5 px-2 text-white/90 hover:bg-white/10"
          >
            <TempleIcon size={18} className="stroke-white/80" />
            <span className="text-[12px] font-medium">{lang === "bn" ? "প্যান্ডেল" : "Pandals"}</span>
          </Link>
          <Link
            href="/help"
            className="liquid-press flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/5 py-2.5 px-2 text-white/90 hover:bg-white/10"
          >
            <ShieldAlertIcon size={18} className="stroke-white/80" />
            <span className="text-[12px] font-medium">{lang === "bn" ? "সাহায্য" : "Help"}</span>
          </Link>
        </div>
      </section>

      {/* ----------------- User Location & Permission Status ----------------- */}
      <section className="mt-3.5">
        {geo.status === "granted" && userPosition ? (
          <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08] px-3.5 py-2.5 text-[12.5px]">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="font-medium text-emerald-200">
                {lang === "bn" ? "আপনার লোকেশন সক্রিয়" : "Your location is active"}
              </span>
            </div>
            <Link
              href="/map?follow=1"
              className="liquid-press inline-flex items-center gap-1 text-[11.5px] font-semibold text-gold hover:underline"
            >
              <MapPinIcon size={14} className="stroke-gold" />
              <span>{lang === "bn" ? "ম্যাপে দেখুন" : "View"}</span>
            </Link>
          </div>
        ) : geo.status === "denied" ? (
          <div className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] px-3.5 py-2.5 text-[12px]">
            <span className="text-amber-200/90">
              {lang === "bn"
                ? "লোকেশন বন্ধ — নৈহাটি স্টেশন কেন্দ্র ধরে দূরত্ব দেখানো হচ্ছে"
                : "Location off — showing distances from Naihati Station"}
            </span>
            <button
              type="button"
              onClick={geo.request}
              className="liquid-press shrink-0 rounded-full border border-amber-400/40 px-2.5 py-1 text-[11px] font-semibold text-amber-200"
            >
              {lang === "bn" ? "পুনরায় চেষ্টা" : "Retry"}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-gold/30 bg-gold/[0.08] p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold">
                  <CrosshairIcon size={17} className="stroke-gold" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">
                    {lang === "bn" ? "লোকেশন অনুমতি দিন" : "Enable Your Location"}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-white/65">
                    {lang === "bn"
                      ? "কাছের প্যান্ডেল ও হাঁটার সঠিক রাস্তা জানতে লোকেশন চালু করুন।"
                      : "Allow location to see nearest pandals and exact walking routes."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={geo.request}
                className="liquid-press shrink-0 rounded-xl bg-gold px-3.5 py-1.5 text-[12px] font-bold text-ink shadow"
              >
                {lang === "bn" ? "অনুমতি দিন" : "Allow"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* -------------------- Nearby Pandals Section -------------------- */}
      <section className="mt-5">
        <div className="flex items-baseline justify-between px-1">
          <div>
            <h2 className="text-[15px] font-bold text-white">
              {lang === "bn" ? "কাছের প্যান্ডেলসমূহ" : "Nearby Pandals"}
            </h2>
            <p className="text-[11.5px] text-white/50">
              {userPosition
                ? lang === "bn"
                  ? "আপনার অবস্থান থেকে দূরত্ব অনুযায়ী সাজানো"
                  : "Sorted by walking distance from you"
                : lang === "bn"
                  ? "নৈহাটি স্টেশন থেকে দূরত্ব অনুযায়ী সাজানো"
                  : "Distances from Naihati Station"}
            </p>
          </div>
          <Link
            href="/pandals"
            className="text-[12px] font-semibold text-gold hover:underline"
          >
            {lang === "bn" ? `সব দেখুন (${pandals.length})` : `All (${pandals.length})`} →
          </Link>
        </div>

        <div className="mt-2.5 space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : (
            nearestPandals.map((pandal) => {
              const walkMin = pandal.distance_m ? walkMinutes(pandal.distance_m) : null;
              return (
                <div
                  key={pandal.slug}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.07]"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
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
                      <CrowdPill info={levels[pandal.slug]} lang={lang} size="sm" />
                    </div>
                  </div>

                  {/* Distance & Action Row */}
                  <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2">
                    <div className="flex items-center gap-2 text-[12px] text-white/70">
                      {typeof pandal.distance_m === "number" ? (
                        <>
                          <span className="font-semibold text-gold">
                            {formatDistance(pandal.distance_m, lang)}
                          </span>
                          {walkMin ? (
                            <span className="flex items-center gap-0.5 text-white/50">
                              <WalkIcon size={13} className="stroke-white/50" />
                              <span>~{walkMin} {lang === "bn" ? "মিনিট" : "min"}</span>
                            </span>
                          ) : null}
                        </>
                      ) : null}
                    </div>

                    <Link
                      href={`/map?pandal=${pandal.slug}&route=1`}
                      className="liquid-press inline-flex items-center gap-1.5 rounded-xl bg-gold/15 px-3 py-1.5 text-[12px] font-semibold text-gold transition-colors hover:bg-gold hover:text-ink"
                    >
                      <NavigationIcon size={13} className="stroke-current" />
                      <span>{lang === "bn" ? "পথ দেখাও" : "Show Route"}</span>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* -------------------- Pandal Categories -------------------- */}
      <section className="mt-5">
        <h2 className="px-1 text-[14px] font-bold text-white">
          {lang === "bn" ? "প্যান্ডেলের ধরন" : "Categories"}
        </h2>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {PANDAL_CATEGORIES.map((category) => {
            const count = categoryCounts[category] ?? 0;
            const title =
              category === "heritage"
                ? lang === "bn"
                  ? "ঐতিহ্যবাহী"
                  : "Heritage"
                : category === "large"
                  ? lang === "bn"
                    ? "বড়"
                    : "Large"
                  : lang === "bn"
                    ? "ছোট"
                    : "Small";
            return (
              <Link
                key={category}
                href={`/map?cat=${category}`}
                className="liquid-card rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 text-center transition-colors hover:bg-white/[0.08]"
              >
                <CategoryTag category={category} lang={lang} />
                <p className="mt-2 text-[17px] font-bold text-white">{count}</p>
                <p className="text-[10px] text-white/45">{title}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
