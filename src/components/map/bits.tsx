"use client";

import { levelColor, levelLabel, levelReason, type CrowdLevel } from "@/lib/crowd";
import { formatDistance, formatMinutes } from "@/lib/geo";
import { facilityLabel } from "@/lib/i18n";
import type { CrowdInfo, Facility, Lang, Pandal, PandalCategory, RouteResult } from "@/lib/types";
import {
  AtmIcon,
  CarIcon,
  HospitalIcon,
  MapPinIcon,
  NavigationIcon,
  ParkingIcon,
  PharmacyIcon,
  PhoneIcon,
  PoliceIcon,
  RestaurantIcon,
  ToiletIcon,
  TrainIcon,
  WalkIcon,
} from "@/components/Icons";

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
      className={`liquid-press flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium whitespace-nowrap transition-colors ${
        active
          ? "border-transparent text-ink font-semibold"
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
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/60">
        <span className="size-1.5 rounded-full bg-white/40" />
        {lang === "bn" ? "তথ্য নেই" : "No data"}
      </span>
    );
  }
  const color = levelColor(info.level as CrowdLevel);
  const label = levelLabel(info.level as CrowdLevel, lang);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium ${
        size === "sm" ? "text-[11px]" : "text-[12px]"
      }`}
      style={{ borderColor: `${color}66`, backgroundColor: `${color}1f`, color }}
      title={levelReason(info, lang)}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
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
          ? "বড়"
          : "Large"
        : lang === "bn"
          ? "ছোট"
          : "Small";
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold tracking-wide"
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
      className={`liquid-card w-full rounded-2xl border p-3 text-left transition-colors ${
        active ? "border-gold/60 bg-gold/10" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CategoryTag category={pandal.category} lang={lang} />
            {pandal.featured ? (
              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">
                {lang === "bn" ? "জনপ্রিয়" : "Popular"}
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 truncate text-[14px] font-semibold text-white">
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

function FacilityIcon({ kind }: { kind: string }) {
  if (kind === "police") {
    return <img src="/police-pin.webp" alt="Police" className="size-5.5 rounded-full object-contain" />;
  }
  if (kind === "hospital") {
    return <img src="/hospital-pin.webp" alt="Hospital" className="size-5.5 rounded-full object-contain" />;
  }
  const size = 15;
  switch (kind) {
    case "hospital":
      return <HospitalIcon size={size} className="stroke-rose-400" />;
    case "police":
      return <PoliceIcon size={size} className="stroke-sky-400" />;
    case "toilets":
      return <ToiletIcon size={size} className="stroke-teal-400" />;
    case "restaurant":
      return <RestaurantIcon size={size} className="stroke-amber-400" />;
    case "railway":
      return <TrainIcon size={size} className="stroke-indigo-400" />;
    case "pharmacy":
      return <PharmacyIcon size={size} className="stroke-emerald-400" />;
    case "atm":
      return <AtmIcon size={size} className="stroke-cyan-400" />;
    case "parking":
      return <ParkingIcon size={size} className="stroke-blue-400" />;
    case "help":
      return <PhoneIcon size={size} className="stroke-amber-400" />;
    default:
      return <MapPinIcon size={size} className="stroke-white/70" />;
  }
}

export function FacilityRow({
  facility,
  lang,
  onRoute,
  routeInfo,
}: {
  facility: Facility;
  lang: Lang;
  onRoute?: () => void;
  routeInfo?: string;
}) {
  return (
    <div className="flex min-h-[58px] flex-col justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/8">
          <FacilityIcon kind={facility.kind} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-white/90">{facility.name}</p>
          <p className="truncate text-[11px] text-white/50">
            {facilityLabel(String(facility.kind), lang)}
            {typeof facility.distance === "number"
              ? ` · ${formatDistance(facility.distance, lang)}`
              : ""}
            {facility.source === "seed" ? (lang === "bn" ? " · আনুমানিক" : " · approx") : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {facility.phone ? (
            <a
              href={`tel:${facility.phone}`}
              className="liquid-press grid size-8 place-items-center rounded-full border border-white/15 bg-white/5 text-gold hover:border-gold/50"
              aria-label="Call"
            >
              <PhoneIcon size={14} className="stroke-current" />
            </a>
          ) : null}
          {onRoute ? (
            <button
              type="button"
              onClick={onRoute}
              className="liquid-press grid size-8 place-items-center rounded-full border border-white/15 bg-white/5 text-white hover:border-gold hover:text-gold"
              aria-label={lang === "bn" ? "পথ" : "Route"}
            >
              <NavigationIcon size={13} className="stroke-current" />
            </button>
          ) : null}
        </div>
      </div>
      {routeInfo ? (
        <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-gold/10 px-2 py-1 text-[11px] text-gold">
          <WalkIcon size={12} className="stroke-current shrink-0" />
          <span>{routeInfo}</span>
        </div>
      ) : null}
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
            <WalkIcon size={13} className="stroke-current" />
            <span>{lang === "bn" ? "হাঁটা" : "Walk"}</span>
          </Chip>
          <Chip active={profile === "car"} onClick={() => onProfileChange("car")}>
            <CarIcon size={13} className="stroke-current" />
            <span>{lang === "bn" ? "গাড়ি" : "Drive"}</span>
          </Chip>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="liquid-press rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11.5px] text-white/70 hover:bg-white/10"
        >
          {lang === "bn" ? "মুছুন" : "Clear"}
        </button>
      </div>
      <div className="mt-2.5 flex items-baseline gap-4">
        <div>
          <p className="text-[19px] font-bold text-white">
            {formatMinutes(minutes, lang)}
          </p>
          <p className="text-[11px] text-white/60">
            {profile === "foot"
              ? lang === "bn"
                ? "হেঁটে (ভিড় ধরে)"
                : "walk (crowd adjusted)"
              : lang === "bn"
                ? "গাড়িতে"
                : "by vehicle"}
          </p>
        </div>
        <div>
          <p className="text-[19px] font-bold text-white">
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
          <summary className="cursor-pointer text-[12px] font-medium text-gold hover:underline">
            {lang === "bn" ? "পথের ধাপ দেখুন" : "Show directions"}
          </summary>
          <ol className="mt-2 space-y-1.5">
            {route.steps.slice(0, 24).map((step, index) => (
              <li key={index} className="flex items-start gap-2 text-[12px] text-white/75">
                <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-white/10 text-[9px] font-semibold">
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
  const options: { level: 1 | 2 | 3 | 4; color: string }[] = [
    { level: 1, color: "#3dd6c0" },
    { level: 2, color: "#f5c76a" },
    { level: 3, color: "#ff914d" },
    { level: 4, color: "#ff5f7e" },
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
            className="liquid-press flex flex-col items-center justify-center rounded-xl border border-white/12 bg-white/5 py-2 px-1 text-center transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            <span
              className="size-3 rounded-full shadow-[0_0_8px_currentColor]"
              style={{ backgroundColor: option.color, color: option.color }}
            />
            <span className="mt-1 block text-[10.5px] font-medium text-white/80">
              {levelLabel(option.level, lang)}
            </span>
          </button>
        ))}
      </div>
      {message ? <p className="mt-2 text-[11.5px] text-gold">{message}</p> : null}
    </div>
  );
}
