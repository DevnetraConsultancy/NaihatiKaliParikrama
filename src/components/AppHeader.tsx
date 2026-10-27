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

export default function AppHeader() {
  const { lang, toggle } = useI18n();
  const pathname = usePathname();

  return (
    <header className="safe-top header-alpona sticky top-0 z-[700] shadow-lg shadow-black/40 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-2 px-3">
        <Link href="/" className="group flex min-w-0 items-center gap-2.5">
          <div className="relative size-9 shrink-0 overflow-hidden rounded-full border border-gold/60 shadow-[0_0_12px_rgba(245,199,106,0.4)] transition-transform group-hover:scale-105">
            <Image
              src="/boro-maa-emblem.png"
              alt="Naihati Boro Maa"
              width={36}
              height={36}
              className="size-full object-cover"
              priority
            />
          </div>
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
              className={`liquid-press rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                pathname === item.href
                  ? "bg-white/12 text-white"
                  : "text-white/65 hover:bg-white/5 hover:text-white/95"
              }`}
            >
              {lang === "bn" ? item.bn : item.en}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={toggle}
          className="liquid-press shrink-0 rounded-full border border-gold/35 bg-ink/60 px-3 py-1 text-[12px] font-semibold text-gold transition-colors hover:border-gold/60"
          aria-label="Switch language"
        >
          {lang === "bn" ? "EN" : "বাংলা"}
        </button>
      </div>
      {/* gold → turmeric → sindoor → indigo rule, the festive edge under the header */}
      <div className="festive-rule h-[2px] w-full" />
    </header>
  );
}
