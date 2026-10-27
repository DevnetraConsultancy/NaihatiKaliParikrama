"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/LanguageProvider";

const NAV = [
  { href: "/map", bn: "ম্যাপ", en: "Map" },
  { href: "/pandals", bn: "প্যান্ডেল", en: "Pandals" },
  { href: "/plan", bn: "পরিক্রমা", en: "Plan" },
  { href: "/help", bn: "সাহায্য", en: "Help" },
  { href: "/about", bn: "সম্পর্কে", en: "About" },
];

/**
 * Traditional Bengali Circular Floral Alpona (পদ্ম আলপনা / Lotus Mandala)
 * Slowly rotates (26s full revolution) in a GPU-accelerated layer.
 */
export function RotatingFloralAlpona({
  size = 30,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative inline-grid shrink-0 place-items-center select-none pointer-events-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        className="size-full animate-spin-slow overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer delicate dotted alpona border */}
        <circle cx="50" cy="50" r="47" stroke="#f5c76a" strokeWidth="1" strokeDasharray="3 3" opacity="0.65" />
        <circle cx="50" cy="50" r="42" stroke="#f5c76a" strokeWidth="0.8" opacity="0.45" />

        {/* 8 Traditional Bengali Lotus / Kolka Petals */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 50 50)`}>
            {/* Lotus Petal Curve */}
            <path
              d="M50 8 C43 22, 42 32, 50 40 C58 32, 57 22, 50 8 Z"
              stroke="#f5c76a"
              strokeWidth="1.4"
              fill="#f5c76a"
              fillOpacity="0.18"
            />
            {/* Central spine of the petal */}
            <line x1="50" y1="16" x2="50" y2="38" stroke="#ffe6a8" strokeWidth="1" opacity="0.9" />
            {/* Pearl tip on petal */}
            <circle cx="50" cy="7" r="1.8" fill="#ffe6a8" />
            {/* Ornamental flanking dots */}
            <circle cx="43" cy="24" r="1.2" fill="#f5c76a" opacity="0.8" />
            <circle cx="57" cy="24" r="1.2" fill="#f5c76a" opacity="0.8" />
          </g>
        ))}

        {/* Inner concentric mandala ring */}
        <circle cx="50" cy="50" r="19" stroke="#f5c76a" strokeWidth="1.2" opacity="0.75" />
        <circle cx="50" cy="50" r="12" stroke="#ffe6a8" strokeWidth="0.8" opacity="0.6" />
        <circle cx="50" cy="50" r="5" fill="#f5c76a" fillOpacity="0.9" />
      </svg>
    </div>
  );
}

/**
 * Auspicious Header Diya with glowing ambient halo and gentle flickering flame
 */
export function HeaderDiya({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center select-none pointer-events-none ${className}`}
      style={{ width: size, height: Math.round(size * 0.95) }}
      aria-hidden="true"
    >
      {/* Soft pulsating warm flame halo */}
      <span
        className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full blur-[6px] opacity-80 pointer-events-none animate-pulse"
        style={{
          width: size * 0.8,
          height: size * 0.8,
          background: "radial-gradient(circle, #f5c76a 0%, #f97316 60%, transparent 75%)",
        }}
      />
      <svg
        viewBox="0 0 36 32"
        className="size-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="hdrDiyaFlame" x1="18" y1="2" x2="18" y2="18" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#fef08a" />
            <stop offset="65%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="hdrDiyaBase" x1="6" y1="18" x2="30" y2="29" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="35%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
        </defs>

        {/* Flickering Teardrop Flame */}
        <g className="animate-flame origin-bottom">
          <path
            d="M18 2 C16 7, 13.5 11, 13.5 15 C13.5 17.5, 15.5 19.5, 18 19.5 C20.5 19.5, 22.5 17.5, 22.5 15 C22.5 11, 20 7, 18 2 Z"
            fill="url(#hdrDiyaFlame)"
          />
          <path
            d="M18 6 C17 9.5, 15.5 12, 15.5 14.5 C15.5 16, 16.5 17.2, 18 17.2 C19.5 17.2, 20.5 16, 20.5 14.5 C20.5 12, 19 9.5, 18 6 Z"
            fill="#ffffff"
            opacity="0.9"
          />
        </g>

        {/* Diya Clay / Terracotta Vessel */}
        <path
          d="M5 19 C5 19, 8 28.5, 18 28.5 C28 28.5, 31 19, 31 19 C31 19, 25 22.5, 18 22.5 C11 22.5, 5 19, 5 19 Z"
          fill="url(#hdrDiyaBase)"
          stroke="#f5c76a"
          strokeWidth="0.8"
        />
        {/* Rim lip highlight */}
        <ellipse cx="18" cy="19" rx="13" ry="2.2" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />
        <ellipse cx="18" cy="19.2" rx="10" ry="1.2" fill="#78350f" opacity="0.65" />
        {/* Base Pedestal */}
        <path d="M14 28.5 H22 L23 30.5 H13 L14 28.5 Z" fill="#78350f" />
      </svg>
    </div>
  );
}

export default function AppHeader() {
  const { lang, toggle } = useI18n();
  const pathname = usePathname();

  return (
    <header className="safe-top header-alpona sticky top-0 z-[700] border-b border-gold/20 shadow-lg shadow-black/50 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-2 px-3">
        {/* Brand Group: Boro Maa Emblem with Rotating Floral Alpona Halo */}
        <Link href="/" className="group flex min-w-0 items-center gap-2">
          <div className="relative flex size-10 shrink-0 items-center justify-center">
            {/* Sacred Floral Alpona Mandala slowly rotating behind/framing the emblem */}
            <RotatingFloralAlpona size={44} className="absolute inset-0 m-auto" />

            {/* Boro Maa Circular Avatar */}
            <div className="relative size-8 shrink-0 overflow-hidden rounded-full border border-gold/80 shadow-[0_0_10px_rgba(245,199,106,0.5)] transition-transform group-hover:scale-105 z-10 bg-ink">
              <Image
                src="/boro-maa-emblem.png"
                alt="Naihati Boro Maa"
                width={32}
                height={32}
                className="size-full object-cover"
                priority
              />
            </div>
          </div>

          <span className="min-w-0">
            <span className="bengali-gradient-text block truncate text-[14.5px] leading-tight font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {lang === "bn" ? "নৈহাটি কালীপূজা পরিক্রমা" : "Naihati Kali Puja"}
            </span>
            <span className="block truncate text-[10px] leading-tight tracking-wide text-white/60 font-medium">
              NaihatiKaliParikrama
            </span>
          </span>
        </Link>

        {/* Center: Desktop Navigation */}
        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`liquid-press rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                pathname === item.href
                  ? "bg-white/12 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white/95"
              }`}
            >
              {lang === "bn" ? item.bn : item.en}
            </Link>
          ))}
        </nav>

        {/* Right Section: Auspicious Diya + Standalone Rotating Alpona + Language Toggle */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Header Floral Alpona Art (Slowly rotating) */}
          <RotatingFloralAlpona size={22} className="inline-grid opacity-90" />

          {/* Header Diya */}
          <HeaderDiya size={26} className="shrink-0" />

          {/* Language Switch Button */}
          <button
            type="button"
            onClick={toggle}
            className="liquid-press shrink-0 rounded-full border border-gold/40 bg-ink/70 px-3 py-1 text-[12px] font-semibold text-gold transition-colors hover:border-gold/70 shadow-sm"
            aria-label="Switch language"
          >
            {lang === "bn" ? "EN" : "বাংলা"}
          </button>
        </div>
      </div>

      {/* Gold → turmeric → sindoor festive edge under the header */}
      <div className="festive-rule h-[1.5px] w-full" />
    </header>
  );
}
