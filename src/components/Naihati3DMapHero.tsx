"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/components/LanguageProvider";
import {
  CarIcon,
  CompassIcon,
  MapIcon,
  MapPinIcon,
  NavigationIcon,
  ShieldAlertIcon,
  TempleIcon,
  TrainIcon,
  WalkIcon,
} from "@/components/Icons";
import type { LatLng } from "@/lib/types";

interface PandalHotspot {
  id: string;
  slug: string;
  name_bn: string;
  name_en: string;
  topPct: number;
  leftPct: number;
  category: "heritage" | "large" | "popular";
  featured?: boolean;
}

const NOTABLE_PANDALS: PandalHotspot[] = [
  {
    id: "boromaa",
    slug: "boro-maa-kali-mandir",
    name_bn: "নৈহাটি বড়মা মন্দির",
    name_en: "Naihati Boro Maa",
    topPct: 47,
    leftPct: 46,
    category: "heritage",
    featured: true,
  },
  {
    id: "anandamoyee",
    slug: "anandamoyee-tala",
    name_bn: "আনন্দময়ীতলা কালীপূজা",
    name_en: "Anandamoyee Tala",
    topPct: 38,
    leftPct: 36,
    category: "heritage",
  },
  {
    id: "arvind",
    slug: "arvind-park-kali-puja",
    name_bn: "অরবিন্দ পার্ক",
    name_en: "Arvind Park",
    topPct: 56,
    leftPct: 52,
    category: "large",
  },
  {
    id: "childrens",
    slug: "childrens-park-kali-puja",
    name_bn: "চিলড্রেনস পার্ক",
    name_en: "Childrens Park",
    topPct: 32,
    leftPct: 58,
    category: "popular",
  },
  {
    id: "shibdanga",
    slug: "shibdanga-kali-puja",
    name_bn: "শিবডাঙ্গা সমিতি",
    name_en: "Shibdanga Samiti",
    topPct: 62,
    leftPct: 38,
    category: "large",
  },
];

export default function Naihati3DMapHero() {
  const { lang } = useI18n();
  const [selectedPin, setSelectedPin] = useState<PandalHotspot | null>(NOTABLE_PANDALS[0]);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-b from-[#19092c] via-[#10071d] to-[#080511] shadow-2xl shadow-black/80">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-72 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, #f5c76a 0%, #c8102e 50%, transparent 75%)" }}
        aria-hidden="true"
      />

      {/* Top Banner Tag */}
      <div className="relative z-20 flex items-center justify-between border-b border-white/10 px-4 py-2.5 backdrop-blur-md bg-black/30">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-gold" />
          </span>
          <span className="text-[12px] font-bold tracking-wide text-gold">
            {lang === "bn" ? "নৈহাটি ৩ডি টেরেন পরিক্রমা" : "Naihati 3D Terrain Model"}
          </span>
        </div>

        <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10.5px] font-semibold text-gold/90">
          {lang === "bn" ? "২৮টি প্যান্ডেল সক্রিয়" : "28 Pandals Active"}
        </span>
      </div>

      {/* -------------------- 3D Isometric Diorama Stage -------------------- */}
      <div className="relative aspect-[16/10] w-full overflow-hidden select-none sm:aspect-[16/9]">
        {/* Photorealistic 3D Cutaway Terrain Block */}
        <Image
          src="/naihati-3d-model.webp"
          alt="Naihati 3D Terrain Map with Kalyani Expressway and Railway"
          width={1376}
          height={768}
          className="size-full object-cover transition-transform duration-700 hover:scale-[1.02]"
          priority
        />

        {/* Soft vignette overlay */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#080511] via-transparent to-transparent opacity-90"
          aria-hidden="true"
        />

        {/* ---------------- Geographic Overlay Labels ---------------- */}

        {/* 1. Hooghly River Badge (West edge) */}
        <div className="pointer-events-none absolute top-[28%] left-[4%] z-20">
          <div className="flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-950/80 px-2 py-1 shadow-lg backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-[9.5px] font-semibold text-sky-200">
              {lang === "bn" ? "হুগলী নদী ও ফেরিঘাট" : "Hooghly River & Ghats"}
            </span>
          </div>
        </div>

        {/* 2. Railway Track & Naihati Jn (Center corridor) */}
        <div className="pointer-events-none absolute top-[18%] left-[38%] z-20">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-950/85 px-2 py-1 shadow-lg backdrop-blur-md">
            <TrainIcon size={11} className="stroke-emerald-300" />
            <span className="text-[9.5px] font-semibold text-emerald-200">
              {lang === "bn" ? "নৈহাটি জংশন ও রেলপথ" : "Naihati Jn & Rail Track"}
            </span>
          </div>
        </div>

        {/* 3. Kalyani Expressway (Eastern corridor) */}
        <div className="pointer-events-none absolute top-[22%] right-[4%] z-20">
          <div className="flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-950/85 px-2 py-1 shadow-lg backdrop-blur-md">
            <CarIcon size={11} className="stroke-amber-300" />
            <span className="text-[9.5px] font-semibold text-amber-200">
              {lang === "bn" ? "কল্যাণী এক্সপ্রেসওয়ে" : "Kalyani Expressway"}
            </span>
          </div>
        </div>

        {/* ---------------- 3D Floating Clouds & Lanterns ---------------- */}
        <div
          className="pointer-events-none absolute top-[10%] left-[16%] z-10 opacity-75 animate-[pulse_4s_ease-in-out_infinite]"
          aria-hidden="true"
        >
          <span className="inline-block rounded-full bg-white/70 px-3 py-1 text-[11px] font-medium text-ink shadow-lg blur-[0.4px]">
            ☁️
          </span>
        </div>
        <div
          className="pointer-events-none absolute top-[14%] right-[22%] z-10 opacity-65 animate-[pulse_5s_ease-in-out_infinite_1s]"
          aria-hidden="true"
        >
          <span className="inline-block rounded-full bg-white/70 px-2.5 py-0.5 text-[10px] text-ink shadow-lg blur-[0.4px]">
            ☁️
          </span>
        </div>

        {/* Floating sky lantern (fanus) */}
        <div
          className="pointer-events-none absolute top-[8%] left-[45%] z-20 animate-bounce"
          style={{ animationDuration: "3.5s" }}
          aria-hidden="true"
        >
          <span className="relative flex size-3.5 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-amber-300 shadow-[0_0_8px_#f59e0b]" />
          </span>
        </div>

        {/* ---------------- Interactive 3D Pandal Pins ---------------- */}
        {NOTABLE_PANDALS.map((pin) => {
          const isSelected = selectedPin?.id === pin.id;
          const isBoroMaa = pin.featured;

          return (
            <div
              key={pin.id}
              className="absolute z-30 -translate-x-1/2 -translate-y-full transition-transform"
              style={{ top: `${pin.topPct}%`, left: `${pin.leftPct}%` }}
            >
              <button
                type="button"
                onClick={() => setSelectedPin(pin)}
                className={`group relative flex flex-col items-center transition-transform hover:scale-115 active:scale-95 ${
                  isSelected ? "scale-110 z-40" : "opacity-90"
                }`}
                aria-label={lang === "bn" ? pin.name_bn : pin.name_en}
              >
                {/* Floating Pin Label */}
                <span
                  className={`mb-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold shadow-lg transition-colors ${
                    isBoroMaa
                      ? "border border-gold bg-gold text-ink"
                      : isSelected
                      ? "border border-amber-300 bg-amber-400 text-ink"
                      : "border border-white/20 bg-ink/90 text-white/95 backdrop-blur-sm"
                  }`}
                >
                  {lang === "bn" ? pin.name_bn : pin.name_en}
                </span>

                {/* 3D Pin Beacon */}
                <div className="relative flex items-center justify-center">
                  {/* Glowing ground pulse */}
                  <span
                    className={`absolute -bottom-1 size-7 rounded-full blur-[3px] opacity-70 animate-pulse ${
                      isBoroMaa ? "bg-gold" : "bg-red-500"
                    }`}
                  />

                  {/* Pin Head */}
                  <div
                    className={`relative flex size-7 items-center justify-center overflow-hidden rounded-full border-2 shadow-xl ${
                      isBoroMaa
                        ? "border-gold bg-[#140722] ring-2 ring-gold/60"
                        : "border-amber-300 bg-[#160a2b]"
                    }`}
                  >
                    <Image
                      src="/boro-maa-emblem.png"
                      alt=""
                      width={28}
                      height={28}
                      className="size-full object-cover"
                    />
                  </div>

                  {/* Pin Point Pointer */}
                  <div
                    className={`size-0 border-x-4 border-t-[6px] border-x-transparent -mt-[1px] ${
                      isBoroMaa ? "border-t-gold" : "border-t-amber-300"
                    }`}
                  />
                </div>
              </button>
            </div>
          );
        })}

        {/* Active Pin Info Drawer / Floating Quick Card */}
        {selectedPin ? (
          <div className="absolute right-3 bottom-3 left-3 z-40 rounded-2xl border border-gold/40 bg-ink/92 p-3 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-gold" />
                  <span className="truncate text-[13px] font-bold text-white">
                    {lang === "bn" ? selectedPin.name_bn : selectedPin.name_en}
                  </span>
                  {selectedPin.featured ? (
                    <span className="rounded-full bg-gold/20 px-1.5 py-0.2 text-[9.5px] font-bold text-gold">
                      {lang === "bn" ? "প্রধান দর্শনীয়" : "Main Deity"}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-white/60">
                  {lang === "bn"
                    ? "নৈহাটি লাইভ ম্যাপে হাঁটার দিকনির্দেশ পান"
                    : "Live walking route & crowd tracker"}
                </p>
              </div>

              <Link
                href={`/map?pandal=${selectedPin.slug}&route=1`}
                className="liquid-press shrink-0 flex items-center gap-1 rounded-full bg-gold px-3 py-1.5 text-[11.5px] font-bold text-ink shadow-md hover:bg-gold/90 transition-transform active:scale-95"
              >
                <NavigationIcon size={12} className="stroke-ink" />
                <span>{lang === "bn" ? "পথ দেখাও" : "Route"}</span>
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {/* -------------------- Quick Access Action Bar -------------------- */}
      <div className="grid grid-cols-3 gap-2 border-t border-white/10 bg-black/40 p-3">
        <Link
          href="/map"
          className="liquid-press flex flex-col items-center justify-center gap-1 rounded-2xl bg-gold py-2.5 px-2 text-ink shadow-lg shadow-gold/20 transition-transform hover:scale-[1.02] active:scale-95"
        >
          <MapIcon size={17} className="stroke-ink" />
          <span className="text-[12px] font-bold leading-tight">
            {lang === "bn" ? "লাইভ ম্যাপ" : "Live Map"}
          </span>
        </Link>

        <Link
          href="/pandals"
          className="liquid-press flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/15 bg-white/5 py-2.5 px-2 text-white/90 hover:bg-white/10 transition-transform active:scale-95"
        >
          <TempleIcon size={17} className="stroke-white/80" />
          <span className="text-[12px] font-medium leading-tight">
            {lang === "bn" ? "২৮টি প্যান্ডেল" : "28 Pandals"}
          </span>
        </Link>

        <Link
          href="/help"
          className="liquid-press flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/15 bg-white/5 py-2.5 px-2 text-white/90 hover:bg-white/10 transition-transform active:scale-95"
        >
          <ShieldAlertIcon size={17} className="stroke-white/80" />
          <span className="text-[12px] font-medium leading-tight">
            {lang === "bn" ? "সাহায্য ও জরুরি" : "Help & Safety"}
          </span>
        </Link>
      </div>
    </div>
  );
}
