import type { CrowdInfo, Lang } from "./types";

export type CrowdLevel = 1 | 2 | 3 | 4;

export const CROWD_COLORS: Record<CrowdLevel, string> = {
  1: "#22c55e",
  2: "#eab308",
  3: "#f97316",
  4: "#ef4444",
};

/**
 * Crowd curve for a Kali Puja night in Naihati. Footfall builds after dusk,
 * peaks between 22:00 and midnight, holds until about 01:00 and falls away
 * towards 04:00. Values are the 1–4 level the model expects at that hour.
 */
const HOUR_CURVE: { hour: number; value: number }[] = [
  { hour: 15, value: 1 },
  { hour: 17, value: 1.2 },
  { hour: 18, value: 1.8 },
  { hour: 19, value: 2.3 },
  { hour: 20, value: 2.8 },
  { hour: 21, value: 3.2 },
  { hour: 22, value: 3.6 },
  { hour: 23, value: 3.8 },
  { hour: 24, value: 3.7 },
  { hour: 25, value: 3.3 },
  { hour: 26, value: 2.7 },
  { hour: 27, value: 2.0 },
  { hour: 28, value: 1.4 },
  { hour: 29, value: 1.1 },
  { hour: 31, value: 1 },
];

const IST_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Hour of day in Naihati (Asia/Kolkata), as a decimal. Serverless functions run
 * in UTC, so the crowd curve must not be derived from server-local time.
 */
export function istHour(at: Date = new Date()): number {
  const parts = IST_FORMATTER.formatToParts(at);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour + minute / 60;
}

function clampLevel(value: number): CrowdLevel {
  if (value <= 1.5) return 1;
  if (value <= 2.5) return 2;
  if (value <= 3.4) return 3;
  return 4;
}

/** Expected crowd level from the clock alone — the fallback when nobody has reported. */
export function baselineLevel(at: Date = new Date()): CrowdLevel {
  const hours = istHour(at);
  const normalised = hours < 12 ? hours + 24 : hours; // 24:00–04:00 continue past midnight
  const curve = HOUR_CURVE;
  if (normalised <= curve[0].hour) return clampLevel(curve[0].value);
  for (let i = 1; i < curve.length; i += 1) {
    const prev = curve[i - 1];
    const next = curve[i];
    if (normalised <= next.hour) {
      const ratio = (normalised - prev.hour) / (next.hour - prev.hour);
      return clampLevel(prev.value + ratio * (next.value - prev.value));
    }
  }
  return clampLevel(curve[curve.length - 1].value);
}

export function levelColor(level: CrowdLevel): string {
  return CROWD_COLORS[level] ?? CROWD_COLORS[1];
}

export function levelLabel(level: CrowdLevel, lang: Lang): string {
  const labels: Record<CrowdLevel, { bn: string; en: string }> = {
    1: { bn: "ফাঁকা", en: "Free" },
    2: { bn: "মাঝারি ভিড়", en: "Moderate" },
    3: { bn: "ভিড়", en: "Busy" },
    4: { bn: "খুব ভিড়", en: "Very busy" },
  };
  return labels[level][lang];
}

/** One-line explanation of why the level is what it is — shown in the detail sheet. */
export function levelReason(info: CrowdInfo, lang: Lang): string {
  if (info.source === "live" && info.reports > 0) {
    return lang === "bn"
      ? `গত এক ঘণ্টায় ${info.reports} জন ভিড়ের রিপোর্ট দিয়েছেন`
      : `Based on ${info.reports} visitor ${info.reports === 1 ? "report" : "reports"} in the last hour`;
  }
  return lang === "bn"
    ? "সময়ের ভিত্তিতে অনুমান — এখনও কেউ রিপোর্ট দেননি"
    : "Time-based estimate — nobody has reported yet";
}

export interface CrowdReport {
  level: number;
  createdAt: number;
}

/**
 * Blend recent visitor reports with the time-of-day baseline.
 * Live reports carry most of the weight, but the baseline keeps a single
 * over-excited report from claiming an empty pandal is packed.
 */
export function blendCrowd(
  reports: CrowdReport[],
  slug: string,
  now: number = Date.now(),
  baseline: CrowdLevel = baselineLevel(new Date(now)),
): CrowdInfo {
  const fresh = reports.filter((report) => now - report.createdAt <= 60 * 60 * 1000);
  if (fresh.length === 0) {
    return {
      slug,
      level: baseline,
      reports: 0,
      source: "estimate",
      updated_at: null,
    };
  }

  let weighted = 0;
  let weightSum = 0;
  let newest = 0;
  for (const report of fresh) {
    const ageMinutes = (now - report.createdAt) / 60000;
    const weight = Math.max(0.25, 1 - ageMinutes / 90); // fresher reports matter more
    weighted += report.level * weight;
    weightSum += weight;
    newest = Math.max(newest, report.createdAt);
  }
  const liveAverage = weighted / weightSum;
  const blended = liveAverage * 0.7 + baseline * 0.3;
  return {
    slug,
    level: clampLevel(blended),
    reports: fresh.length,
    source: "live",
    updated_at: new Date(newest).toISOString(),
  };
}

/** How busy the whole area is right now, averaged across nearby pandals. */
export function areaLevel(levels: CrowdInfo[], lang: Lang): { level: CrowdLevel; label: string } {
  if (levels.length === 0) {
    return { level: 1, label: levelLabel(1, lang) };
  }
  const average = levels.reduce((sum, item) => sum + item.level, 0) / levels.length;
  const level = clampLevel(average);
  return { level, label: levelLabel(level, lang) };
}
