"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useI18n } from "@/components/LanguageProvider";
import { CategoryTag, CrowdPill } from "@/components/map/bits";
import { useCrowdLevels, useGeolocation, usePandals } from "@/lib/hooks";
import { PANDAL_CATEGORIES } from "@/lib/types";

const SAMPLE_DATA = process.env.NEXT_PUBLIC_SAMPLE_DATA === "1";

export default function HomeContent() {
  const { lang, t } = useI18n();
  const { pandals, source, loading } = usePandals();
  const geo = useGeolocation(true);
  const { levels } = useCrowdLevels(useMemo(() => pandals.map((pandal) => pandal.slug), [pandals]));

  const counts = useMemo(() => {
    return PANDAL_CATEGORIES.reduce<Record<string, number>>((accumulator, category) => {
      accumulator[category] = pandals.filter((pandal) => pandal.category === category).length;
      return accumulator;
    }, {});
  }, [pandals]);

  const featured = pandals.filter((pandal) => pandal.featured).slice(0, 3);
  const liveReports = Object.values(levels).filter(
    (info) => info && info.source === "live" && info.reports > 0,
  ).length;

  return (
    <div className="mx-auto w-full max-w-2xl px-3 pt-5 pb-28">
      <section className="glass relative overflow-hidden rounded-3xl p-5">
        <div
          className="pointer-events-none absolute -top-24 -right-16 size-56 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #f5c76a 0%, transparent 70%)" }}
        />
        <p className="text-[11.5px] font-semibold tracking-[0.18em] text-gold uppercase">
          Naihati · Kartik Amavasya
        </p>
        <h1 className="bn-text mt-2 text-[27px] leading-[1.2] font-bold text-white">
          {lang === "bn" ? (
            <>
              নৈহাটির কালীপূজা
              <br />
              এক ম্যাপেই পুরো পরিক্রমা
            </>
          ) : (
            <>
              Naihati&apos;s Kali Puja
              <br />
              the whole parikrama on one map
            </>
          )}
        </h1>
        <p className="bn-text mt-2.5 text-[13.5px] leading-relaxed text-white/70">
          {lang === "bn"
            ? "কিউআর কোড স্ক্যান করুন, লোকেশন চালু করুন — আপনার জায়গা, পরের প্যান্ডেল, হাঁটার রাস্তা, সময় আর এখন কত ভিড়, সব একসাথে।"
            : "Scan the QR code, allow location, and see where you are, which pandal is next, the walking route, travel time and how busy it is right now."}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/map"
            className="liquid-press glow-gold rounded-2xl bg-gold px-5 py-3 text-[14px] font-semibold text-ink"
          >
            ➤ {t("openMap")}
          </Link>
          <Link
            href="/plan"
            className="liquid-press rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-[14px] text-white/85"
          >
            🧭 {t("planTitle")}
          </Link>
          <Link
            href="/help"
            className="liquid-press rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-[14px] text-white/85"
          >
            🚨 {t("navHelp")}
          </Link>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/[0.06] px-2 py-2.5">
            <dt className="text-[10.5px] text-white/50">{t("navPandals")}</dt>
            <dd className="text-[19px] font-bold text-white">
              {loading ? "…" : pandals.length}
            </dd>
          </div>
          <div className="rounded-2xl bg-white/[0.06] px-2 py-2.5">
            <dt className="text-[10.5px] text-white/50">{t("heritage")}</dt>
            <dd className="text-[19px] font-bold text-gold">{counts.heritage ?? 0}</dd>
          </div>
          <div className="rounded-2xl bg-white/[0.06] px-2 py-2.5">
            <dt className="text-[10.5px] text-white/50">{t("live")}</dt>
            <dd className="text-[19px] font-bold text-small">{liveReports}</dd>
          </div>
        </dl>
      </section>

      {geo.status === "granted" && geo.position ? (
        <p className="mt-3 text-center text-[11.5px] text-white/50">
          📍{" "}
          {lang === "bn"
            ? "আপনার লোকেশন পাওয়া গেছে — কাছের প্যান্ডেল হিসাব করা হচ্ছে"
            : "Location found — distances are measured from where you stand"}
        </p>
      ) : null}

      {SAMPLE_DATA && source === "seed" ? (
        <div className="mt-4 rounded-2xl border border-gold/30 bg-gold/10 px-3.5 py-3 text-[12px] text-white/85">
          ⚠️ {t("sampleBanner")}
        </div>
      ) : null}

      <section className="mt-6">
        <h2 className="text-[15px] font-semibold text-white">{t("layerPuja")}</h2>
        <p className="text-[12px] text-white/55">
          {lang === "bn"
            ? "তিন ধরনের প্যান্ডেল — ম্যাপে রঙ দিয়ে আলাদা করা"
            : "Three categories, colour-coded on the map"}
        </p>
        <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
          {PANDAL_CATEGORIES.map((category) => {
            const color =
              category === "heritage"
                ? "var(--color-heritage)"
                : category === "large"
                  ? "var(--color-large)"
                  : "var(--color-small)";
            return (
              <Link
                key={category}
                href={`/map?cat=${category}`}
                className="liquid-card rounded-2xl border border-white/10 bg-white/[0.04] p-3.5"
                style={{ boxShadow: `inset 3px 0 0 ${color}` }}
              >
                <div className="flex items-center justify-between">
                  <CategoryTag category={category} lang={lang} />
                  <span className="text-[17px] font-bold text-white">{counts[category] ?? 0}</span>
                </div>
                <p className="bn-text mt-1.5 text-[12px] text-white/60">
                  {category === "heritage"
                    ? lang === "bn"
                      ? "বড়মা, কালীমন্দির, ঘাটের পুরনো পূজা"
                      : "Boro Maa, temple and ghat Pujas"
                    : category === "large"
                      ? lang === "bn"
                        ? "মাঠের বড় প্যান্ডেল, থিম আর আলোর সাজ"
                        : "Ground pandals with themes and light"
                      : lang === "bn"
                        ? "পাড়ার গলির ছোট পূজা"
                        : "Neighbourhood lane Pujas"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-[15px] font-semibold text-white">
            {lang === "bn" ? "অবশ্যই দেখুন" : "Must visit"}
          </h2>
          <div className="mt-2.5 space-y-2">
            {featured.map((pandal) => (
              <Link
                key={pandal.slug}
                href={`/map?pandal=${pandal.slug}`}
                className="liquid-card block rounded-2xl border border-white/10 bg-white/[0.04] p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CategoryTag category={pandal.category} lang={lang} />
                    <p className="mt-1.5 text-[15px] font-semibold text-white">
                      {lang === "bn" ? pandal.name_bn : pandal.name_en}
                    </p>
                    <p className="text-[12px] text-white/55">
                      {lang === "bn" ? pandal.area_bn : pandal.area_en}
                    </p>
                  </div>
                  <CrowdPill info={levels[pandal.slug]} lang={lang} size="sm" />
                </div>
                {pandal.description_en ? (
                  <p className="bn-text mt-2 text-[12px] leading-relaxed text-white/65">
                    {lang === "bn" ? pandal.description_bn : pandal.description_en}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-[15px] font-semibold text-white">{t("howToUse")}</h2>
        <ol className="mt-2 space-y-2 text-[12.5px] text-white/70">
          {(lang === "bn"
            ? [
                "রাস্তার ব্যানারে থাকা কিউআর কোড স্ক্যান করুন — এই অ্যাপ খুলবে।",
                "«লোকেশন চালু করুন» চাপুন। নীল বিন্দু আপনার জায়গা দেখাবে।",
                "সোনালি পিন ঐতিহ্যবাহী, গোলাপি বড় আর সবুজ-নীল ছোট প্যান্ডেল।",
                "নিচের কার্ডে পরের প্যান্ডেল, দূরত্ব আর হাঁটার সময় দেখুন।",
                "«পথ দেখাও» চাপলে রাস্তা ও ধাপে ধাপে নির্দেশ পাবেন।",
                "ভিড়ের রিপোর্ট দিলে পরের ভক্তরা আগেই জানতে পারবেন।",
              ]
            : [
                "Scan the QR code on the roadside banner to open this app.",
                "Tap “Turn on location”. The blue dot shows where you stand.",
                "Gold pins are heritage, pink are large, teal are small pandals.",
                "The card at the bottom shows the next pandal, distance and walk time.",
                "Tap “Show route” for the walking path and step-by-step directions.",
                "Report the crowd so the next visitor knows before arriving.",
              ]
          ).map((step, index) => (
            <li key={step} className="flex gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-gold/20 text-[11px] font-semibold text-gold">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link
          href="/help"
          className="liquid-card rounded-2xl border border-white/10 bg-white/[0.04] p-3.5"
        >
          <p className="text-[13.5px] font-semibold text-white">
            🚨 {lang === "bn" ? "জরুরি জায়গা" : "Emergency places"}
          </p>
          <p className="bn-text mt-1 text-[12px] text-white/60">
            {lang === "bn"
              ? "কাছের হাসপাতাল, থানা, শৌচালয়, খাবারের দোকান ও হেল্পলাইন।"
              : "Nearest hospital, police station, toilet, food and helplines."}
          </p>
        </Link>
        <Link
          href="/pandals"
          className="liquid-card rounded-2xl border border-white/10 bg-white/[0.04] p-3.5"
        >
          <p className="text-[13.5px] font-semibold text-white">
            🛕 {lang === "bn" ? "প্যান্ডেলের তালিকা" : "Pandal directory"}
          </p>
          <p className="bn-text mt-1 text-[12px] text-white/60">
            {lang === "bn"
              ? "নাম, এলাকা ও ধরন দিয়ে খুঁজুন — দূরত্ব অনুযায়ী সাজানো।"
              : "Search by name, area and category — sorted by distance."}
          </p>
        </Link>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-[14px] font-semibold text-white">{t("dataCredit")}</h2>
        <ul className="mt-2 space-y-1.5 text-[11.5px] text-white/60">
          <li>
            •{" "}
            {lang === "bn"
              ? "ম্যাপ ও রাস্তা: OpenStreetMap ও OSRM (ফ্রি, কোনো API কী ছাড়া)।"
              : "Map tiles and routing: OpenStreetMap with OSRM (free, no API key)."}
          </li>
          <li>
            •{" "}
            {lang === "bn"
              ? "হাসপাতাল, থানা, শৌচালয়, খাবারের তথ্য: OpenStreetMap-এর লাইভ ডেটা।"
              : "Hospitals, police, toilets and food: live OpenStreetMap data."}
          </li>
          <li>
            •{" "}
            {lang === "bn"
              ? "ভিড়ের মাত্রা: দর্শকদের রিপোর্ট + সময়ভিত্তিক অনুমান (কোনো সরকারি লাইভ ডেটা নয়)।"
              : "Crowd level: visitor reports blended with a time-of-day estimate (not official data)."}
          </li>
          <li>
            •{" "}
            {lang === "bn"
              ? "এটি সরকারি অ্যাপ নয় — স্থানীয় স্বেচ্ছাসেবকদের জন্য তৈরি একটি সহায়ক ম্যাপ।"
              : "This is a community helper map, not an official municipal app."}
          </li>
        </ul>
      </section>

      {geo.position ? (
        <p className="mt-4 text-center text-[11px] text-white/40">
          {lang === "bn" ? "আপনার লোকেশন শুধু আপনার ফোনেই থাকে, সার্ভারে জমা হয় না।" : "Your location stays on your phone; it is never stored on the server."}
        </p>
      ) : null}
    </div>
  );
}
