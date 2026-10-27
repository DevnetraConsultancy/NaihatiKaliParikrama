"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlponaMedallion } from "@/components/Alpona";
import { useI18n } from "@/components/LanguageProvider";

const NAV = [
  { href: "/map", bn: "ম্যাপ", en: "Map" },
  { href: "/pandals", bn: "প্যান্ডেল", en: "Pandals" },
  { href: "/plan", bn: "পরিক্রমা", en: "Plan" },
  { href: "/help", bn: "সাহায্য", en: "Help" },
  { href: "/about", bn: "সম্পর্কে", en: "About" },
];

export default function AppHeader() {
  const { lang, toggle } = useI18n();
  const pathname = usePathname();

  return (
    <header className="safe-top header-alpona sticky top-0 z-[700] shadow-lg shadow-black/30 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-2 px-3">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <AlponaMedallion size={36} className="shrink-0 drop-shadow-[0_2px_10px_rgba(245,199,106,0.35)]" />
          <span className="min-w-0">
            <span className="bengali-gradient-text block truncate text-[14px] leading-tight font-bold">
              {lang === "bn" ? "নৈহাটি কালীপূজা পরিক্রমা" : "Naihati Kali Puja"}
            </span>
            <span className="block truncate text-[10px] leading-tight tracking-wide text-white/55">
              NaihatiKaliParikrama
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`liquid-press rounded-full px-3 py-1.5 text-[12.5px] ${
                pathname === item.href
                  ? "bg-white/12 text-white"
                  : "text-white/65 hover:bg-white/5 hover:text-white/90"
              }`}
            >
              {lang === "bn" ? item.bn : item.en}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={toggle}
          className="liquid-press shrink-0 rounded-full border border-gold/35 bg-ink/50 px-3 py-1.5 text-[12px] font-semibold text-gold"
          aria-label="Switch language"
        >
          {lang === "bn" ? "EN" : "বাংলা"}
        </button>
      </div>
      {/* gold → turmeric → sindoor → indigo rule, the festive edge under the header */}
      <div className="festive-rule h-[3px] w-full" />
    </header>
  );
}
