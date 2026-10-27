"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/LanguageProvider";

const TABS = [
  { href: "/map", icon: "🗺", key: "navMap" },
  { href: "/pandals", icon: "🛕", key: "navPandals" },
  { href: "/plan", icon: "🧭", key: "navPlan" },
  { href: "/help", icon: "🚨", key: "navHelp" },
];

/** Thumb-reachable navigation for the Android phones most visitors will use. */
export default function TabBar() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-[700] border-t border-white/8 bg-ink/85 backdrop-blur-xl sm:hidden">
      <ul className="mx-auto flex h-16 max-w-2xl items-stretch justify-around">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`liquid-press flex h-full flex-col items-center justify-center gap-0.5 ${
                  active ? "text-gold" : "text-white/55"
                }`}
              >
                <span className="text-[19px] leading-none">{tab.icon}</span>
                <span className="text-[10.5px] font-medium">{t(tab.key)}</span>
                {active ? <span className="mt-0.5 h-0.5 w-6 rounded-full bg-gold" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
