"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/LanguageProvider";

const NAV = [
  { href: "/map", key: "navMap" },
  { href: "/pandals", key: "navPandals" },
  { href: "/plan", key: "navPlan" },
  { href: "/help", key: "navHelp" },
  { href: "/about", key: "navAbout" },
];

export default function AppHeader() {
  const { lang, toggle } = useI18n();
  const pathname = usePathname();

  return (
    <header className="safe-top sticky top-0 z-[700] border-b border-white/8 bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-2 px-3">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold to-large text-[15px] font-bold text-ink">
            ❋
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] leading-tight font-semibold text-white">
              {lang === "bn" ? "নৈহাটি কালীপূজা" : "Naihati Kali Puja"}
            </span>
            <span className="block truncate text-[10.5px] leading-tight text-white/50">
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
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white/90"
              }`}
            >
              {lang === "bn"
                ? { navMap: "ম্যাপ", navPandals: "প্যান্ডেল", navPlan: "পরিক্রমা", navHelp: "সাহায্য", navAbout: "সম্পর্কে" }[
                    item.key
                  ]
                : { navMap: "Map", navPandals: "Pandals", navPlan: "Plan", navHelp: "Help", navAbout: "About" }[
                    item.key
                  ]}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={toggle}
          className="liquid-press shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-white/85"
          aria-label="Switch language"
        >
          {lang === "bn" ? "EN" : "বাংলা"}
        </button>
      </div>
    </header>
  );
}
