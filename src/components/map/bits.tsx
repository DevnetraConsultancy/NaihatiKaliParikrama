"use client";

import { levelColor, levelLabel, levelReason, type CrowdLevel } from "@/lib/crowd";
import { formatDistance, formatMinutes } from "@/lib/geo";
import { facilityLabel } from "@/lib/i18n";
import type { CrowdInfo, Facility, Lang, Pandal, PandalCategory, RouteResult } from "@/lib/types";

export const CATEGORY_COLOR: Record<PandalCategory, string> = {
  heritage: "var(--color-heritage)",
  large: "var(--color-large)",
  small: "var(--color-small)",
};

export function Chip({
  active,
  onClick,
  children,
  color,
  title,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  color?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`liquid-press flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium whitespace-nowrap ${
        active
          ? "border-transparent text-ink"
          : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
      }`}
      style={active ? { backgroundColor: color ?? "var(--color-gold)" } : undefined}
    >
      {children}
    </button>
  );
}

export function CrowdPill({
  info,
  lang,
  size = "md",
}: {
  info?: CrowdInfo | null;
  lang: Lang;
  size?: "sm" | "md";
}) {
  if (!info) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/60">
        <span className="size-2 rounded-full bg-white/40" />
        {lang === "bn" ? "ভিড়ের তথ্য নেই" : "No crowd data"}
      </span>
    );
  }
  const color = levelColor(info.level as CrowdLevel);
  const label = levelLabel(info.level as CrowdLevel, lang);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${
        size === "sm" ? "text-[11px]" : "text-[12px]"
      }`}
      style={{ borderColor: `${color}66`, backgroundColor: `${color}1f`, color }}
      title={levelReason(info, lang)}
    >
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
      {info.source === "live" && info.reports > 0 ? (
        <span className="opacity-70">· {info.reports}</span>
      ) : null}
    </span>
  );
}

export function CategoryTag({ category, lang }: { category: PandalCategory; lang: Lang }) {
  const label =
    category === "heritage"
      ? lang === "bn"
        ? "ঐতিহ্যবাহী"
        : "Heritage"
      : category === "large"
        ? lang === "bn"
          ? "বড় প্যান্ডেল"
          : "Large"
        : lang === "bn"
          ? "ছোট প্যান্ডেল"
          : "Small";
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold tracking-wide"
      style={{
        color: CATEGORY_COLOR[category],
        backgroundColor:
          category === "heritage"
            ? "rgb(245 199 106 / 0.16)"
            : category === "large"
              ? "rgb(255 95 126 / 0.16)"
              : "rgb(61 214 192 / 0.16)",
      }}
    >
      {label}
    </span>
  );
}

export function PandalRow({
  pandal,
  lang,
  distance,
  crowd,
  active,
  onClick,
}: {
  pandal: Pandal;
  lang: Lang;
  distance?: number;
  crowd?: CrowdInfo;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`liquid-card w-full rounded-2xl border p-3 text-left ${
        active ? "border-gold/60 bg-gold/10" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CategoryTag category={pandal.category} lang={lang} />
            {pandal.featured ? (
              <span className="text-[10.5px] font-semibold text-gold">
                {lang === "bn" ? "জনপ্রিয়" : "Popular"}
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 truncate text-[14.5px] font-semibold text-white">
            {lang === "bn" ? pandal.name_bn : pandal.name_en}
          </p>
          <p className="truncate text-[11.5px] text-white/55">
            {lang === "bn" ? pandal.area_bn : pandal.area_en}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {typeof distance === "number" ? (
            <span className="text-[12px] font-semibold text-gold">
              {formatDistance(distance, lang)}
            </span>
          ) : null}
          <CrowdPill info={crowd} lang={lang} size="sm" />
        </div>
      </div>
    </button>
  );
}

export function FacilityRow({
  facility,
  lang,
  onRoute,
}: {
  facility: Facility;
  lang: Lang;
  onRoute?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/8 text-[15px]">
        {facility.kind === "hospital"
          ? "🏥"
          : facility.kind === "police"
            ? "🚓"
            : facility.kind === "toilets"
              ? "🚻"
              : facility.kind === "restaurant"
                ? "🍽"
                : facility.kind === "railway"
                  ? "🚉"
                  : facility.kind === "pharmacy"
                    ? "💊"
                    : facility.kind === "ferry"
                      ? "⛴"
                      : facility.kind === "atm"
                        ? "🏧"
                        : facility.kind === "parking"
                          ? "🅿"
                          : facility.kind === "help"
                            ? "☎"
                            : "📍"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-white/90">{facility.name}</p>
        <p className="truncate text-[11px] text-white/50">
          {facilityLabel(String(facility.kind), lang)}
          {typeof facility.distance === "number"
            ? ` · ${formatDistance(facility.distance, lang)}`
            : ""}
          {facility.source === "seed" ? (lang === "bn" ? " · আনুমানিক" : " · approximate") : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {facility.phone ? (
          <a
            href={`tel:${facility.phone}`}
            className="liquid-press grid size-8 place-items-center rounded-full border border-white/15 bg-white/5 text-[13px]"
            aria-label="Call"
          >
            ☎
          </a>
        ) : null}
        {onRoute ? (
          <button
            type="button"
            onClick={onRoute}
            className="liquid-press grid size-8 place-items-center rounded-full border border-white/15 bg-white/5 text-[13px]"
            aria-label={lang === "bn" ? "পথ" : "Route"}
          >
            ➤
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function RouteSummary({
  route,
  lang,
  profile,
  onProfileChange,
  onClear,
}: {
  route: RouteResult;
  lang: Lang;
  profile: "foot" | "car";
  onProfileChange: (profile: "foot" | "car") => void;
  onClear: () => void;
}) {
  const minutes = profile === "foot" ? route.walk_min : route.drive_min;
  return (
    <div className="rounded-2xl border border-gold/35 bg-gold/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <Chip active={profile === "foot"} onClick={() => onProfileChange("foot")}>
            🚶 {lang === "bn" ? "হাঁটা" : "Walk"}
          </Chip>
          <Chip active={profile === "car"} onClick={() => onProfileChange("car")}>
            🛺 {lang === "bn" ? "গাড়ি" : "Drive"}
          </Chip>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="liquid-press rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[12px] text-white/70"
        >
          {lang === "bn" ? "পথ মুছুন" : "Clear"}
        </button>
      </div>
      <div className="mt-2.5 flex items-baseline gap-4">
        <div>
          <p className="text-[19px] font-semibold text-white">
            {formatMinutes(minutes, lang)}
          </p>
          <p className="text-[11px] text-white/60">
            {profile === "foot"
              ? lang === "bn"
                ? "হেঁটে (ভিড় ধরে)"
                : "on foot (crowd adjusted)"
              : lang === "bn"
                ? "গাড়িতে"
                : "by vehicle"}
          </p>
        </div>
        <div>
          <p className="text-[19px] font-semibold text-white">
            {formatDistance(route.distance_m, lang)}
          </p>
          <p className="text-[11px] text-white/60">{lang === "bn" ? "দূরত্ব" : "distance"}</p>
        </div>
        {route.cached ? (
          <span className="ml-auto text-[10.5px] text-white/45">
            {lang === "bn" ? "সেভ করা" : "cached"}
          </span>
        ) : null}
      </div>
      {route.steps.length > 0 ? (
        <details className="mt-2.5">
          <summary className="cursor-pointer text-[12px] font-medium text-gold">
            {lang === "bn" ? "পথের ধাপ দেখুন" : "Show directions"}
          </summary>
          <ol className="mt-2 space-y-1.5">
            {route.steps.slice(0, 24).map((step, index) => (
              <li key={index} className="flex items-start gap-2 text-[12px] text-white/75">
                <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-white/10 text-[9px]">
                  {index + 1}
                </span>
                <span className="flex-1">
                  {lang === "bn" ? step.instruction_bn : step.instruction_en}
                  {step.distance > 12 ? (
                    <span className="text-white/45"> · {formatDistance(step.distance, lang)}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}

export function CrowdReporter({
  lang,
  onReport,
  busy,
  message,
}: {
  lang: Lang;
  onReport: (level: 1 | 2 | 3 | 4) => void;
  busy?: boolean;
  message?: string | null;
}) {
  const options: { level: 1 | 2 | 3 | 4; emoji: string }[] = [
    { level: 1, emoji: "🟢" },
    { level: 2, emoji: "🟡" },
    { level: 3, emoji: "🟠" },
    { level: 4, emoji: "🔴" },
  ];
  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-3">
      <p className="text-[12px] font-medium text-white/80">
        {lang === "bn" ? "এখানে ভিড় কেমন?" : "How crowded is it here?"}
      </p>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {options.map((option) => (
          <button
            key={option.level}
            type="button"
            disabled={busy}
            onClick={() => onReport(option.level)}
            className="liquid-press rounded-xl border border-white/12 bg-white/5 px-1 py-2 text-center disabled:opacity-50"
          >
            <span className="block text-[13px]">{option.emoji}</span>
            <span className="mt-0.5 block text-[10.5px] text-white/75">
              {levelLabel(option.level, lang)}
            </span>
          </button>
        ))}
      </div>
      {message ? <p className="mt-2 text-[11.5px] text-gold">{message}</p> : null}
    </div>
  );
}
