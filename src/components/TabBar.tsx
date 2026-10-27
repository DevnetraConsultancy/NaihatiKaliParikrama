"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/LanguageProvider";
import { CompassIcon, MapIcon, ShieldAlertIcon, TempleIcon } from "@/components/Icons";

const TABS = [
  { href: "/map", Icon: MapIcon, key: "navMap" },
  { href: "/pandals", Icon: TempleIcon, key: "navPandals" },
  { href: "/plan", Icon: CompassIcon, key: "navPlan" },
  { href: "/help", Icon: ShieldAlertIcon, key: "navHelp" },
];

/** Thumb-reachable navigation for mobile screens */
export default function TabBar() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-[700] border-t border-white/10 bg-ink/90 backdrop-blur-xl sm:hidden">
      <ul className="mx-auto flex h-16 max-w-md items-stretch justify-around px-2">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.Icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`liquid-press flex h-full flex-col items-center justify-center gap-1 transition-colors ${
                  active ? "text-gold" : "text-white/50 hover:text-white/80"
                }`}
              >
                <Icon size={20} className={active ? "stroke-gold" : "stroke-white/50"} />
                <span className="text-[11px] font-medium tracking-tight">{t(tab.key)}</span>
                {active ? <span className="h-0.5 w-5 rounded-full bg-gold shadow-[0_0_8px_rgba(245,199,106,0.6)]" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
