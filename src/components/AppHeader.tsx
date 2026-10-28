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
 * Auspicious Header Diya with flickering flame
 */
export function HeaderDiya({ size = 22 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center select-none pointer-events-none"
      style={{ width: size, height: Math.round(size * 0.95) }}
      aria-hidden="true"
    >
      <span
        className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full blur-[5px] opacity-75 animate-pulse"
        style={{
          width: size * 0.75,
          height: size * 0.75,
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
          <linearGradient id="hFlame" x1="18" y1="2" x2="18" y2="18" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#fef08a" />
            <stop offset="65%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="hDiya" x1="6" y1="18" x2="30" y2="29" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="35%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
        </defs>

        <g className="animate-flame origin-bottom">
          <path
            d="M18 2 C16 7, 13.5 11, 13.5 15 C13.5 17.5, 15.5 19.5, 18 19.5 C20.5 19.5, 22.5 17.5, 22.5 15 C22.5 11, 20 7, 18 2 Z"
            fill="url(#hFlame)"
          />
        </g>

        <path
          d="M5 19 C5 19, 8 28.5, 18 28.5 C28 28.5, 31 19, 31 19 C31 19, 25 22.5, 18 22.5 C11 22.5, 5 19, 5 19 Z"
          fill="url(#hDiya)"
          stroke="#f5c76a"
          strokeWidth="0.8"
        />
        <ellipse cx="18" cy="19" rx="13" ry="2.2" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />
      </svg>
    </span>
  );
}

export default function AppHeader() {
  const { lang, toggle } = useI18n();
  const pathname = usePathname();

  return (
    <header className="safe-top header-alpona sticky top-0 z-[700] border-b border-gold/25 shadow-lg shadow-black/60 backdrop-blur-xl relative overflow-hidden">
      {/* Large rotating Golden Mandala Art (only 1/4 visible in top-right corner) */}
      <div
        className="pointer-events-none absolute -top-16 -right-16 size-48 sm:size-56 overflow-hidden select-none z-0"
        aria-hidden="true"
      >
        <div className="size-full opacity-35 filter blur-[0.2px] animate-spin-slow origin-center">
          <Image
            src="/golden-mandala.webp"
            alt=""
            width={224}
            height={224}
            className="size-full object-contain"
            priority
          />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex h-16 w-full max-w-2xl items-center justify-between gap-2.5 px-3.5">
        {/* Brand Group: Prominent Logo + Bold Clear Title */}
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <div className="relative size-11 shrink-0 overflow-hidden rounded-full border-2 border-gold/85 shadow-[0_0_12px_rgba(245,199,106,0.55)] transition-transform group-hover:scale-105 bg-ink p-0.5">
            <Image
              src="/boro-maa-emblem.png"
              alt="Naihati Boro Maa"
              width={44}
              height={44}
              className="size-full rounded-full object-cover"
              priority
            />
          </div>

          <div className="min-w-0 flex flex-col justify-center">
            <span className="text-[15.5px] sm:text-[17px] font-extrabold text-white tracking-tight truncate leading-tight drop-shadow-sm">
              {lang === "bn" ? "নৈহাটি কালীপূজা" : "Naihati Kali Puja"}
            </span>
            <span className="text-[11px] sm:text-[12px] font-semibold text-gold tracking-wide truncate leading-tight mt-0.5">
              {lang === "bn" ? "পরিক্রমা ২০২৬" : "Parikrama 2026"}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
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

        {/* Right Section: Header Diya + Language Toggle */}
        <div className="flex shrink-0 items-center gap-2.5">
          {/* Auspicious Diya */}
          <HeaderDiya size={22} />

          {/* Language Switch Button */}
          <button
            type="button"
            onClick={toggle}
            className="liquid-press shrink-0 rounded-full border border-gold/40 bg-ink/70 px-2.5 py-0.5 text-[11.5px] font-semibold text-gold transition-colors hover:border-gold/70 shadow-sm"
            aria-label="Switch language"
          >
            {lang === "bn" ? "EN" : "বাংলা"}
          </button>
        </div>
      </div>

      {/* Gold → turmeric festive bottom edge rule */}
      <div className="festive-rule h-[1.5px] w-full" />
    </header>
  );
}
