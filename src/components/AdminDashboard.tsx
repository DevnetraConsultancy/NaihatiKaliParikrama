"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/LanguageProvider";
import { invalidatePandals } from "@/lib/client-api";
import { PANDAL_CATEGORIES, type Pandal, type PandalCategory } from "@/lib/types";

const LeafletCanvas = dynamic(() => import("@/components/map/LeafletCanvas"), {
  ssr: false,
  loading: () => <div className="h-56 w-full animate-pulse rounded-2xl bg-white/5" />,
});

interface FormState {
  slug: string;
  name_en: string;
  name_bn: string;
  category: PandalCategory;
  area_en: string;
  area_bn: string;
  lat: string;
  lng: string;
  landmark_en: string;
  landmark_bn: string;
  committee: string;
  established: string;
  description_en: string;
  description_bn: string;
  featured: boolean;
  verified: boolean;
}

const EMPTY_FORM: FormState = {
  slug: "",
  name_en: "",
  name_bn: "",
  category: "large",
  area_en: "",
  area_bn: "",
  lat: "22.8878",
  lng: "88.4183",
  landmark_en: "",
  landmark_bn: "",
  committee: "",
  established: "",
  description_en: "",
  description_bn: "",
  featured: false,
  verified: false,
};

function toForm(pandal: Pandal): FormState {
  return {
    slug: pandal.slug,
    name_en: pandal.name_en ?? "",
    name_bn: pandal.name_bn ?? "",
    category: pandal.category,
    area_en: pandal.area_en ?? "",
    area_bn: pandal.area_bn ?? "",
    lat: String(pandal.lat),
    lng: String(pandal.lng),
    landmark_en: pandal.landmark_en ?? "",
    landmark_bn: pandal.landmark_bn ?? "",
    committee: pandal.committee ?? "",
    established: pandal.established ? String(pandal.established) : "",
    description_en: pandal.description_en ?? "",
    description_bn: pandal.description_bn ?? "",
    featured: Boolean(pandal.featured),
    verified: Boolean(pandal.verified),
  };
}

function Field({
  label,
  value,
  onChange,
  textarea,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  placeholder?: string;
}) {
  const shared =
    "mt-1 w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-[13px] text-white placeholder:text-white/35 focus:border-gold/50 focus:outline-none";
  return (
    <label className="block">
      <span className="text-[11.5px] text-white/55">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          rows={3}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={shared}
        />
      ) : (
        <input
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={shared}
        />
      )}
    </label>
  );
}

export default function AdminDashboard() {
  const { lang } = useI18n();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [pandals, setPandals] = useState<Pandal[]>([]);
  const [source, setSource] = useState<string>("seed");
  const [database, setDatabase] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/pandals", { cache: "no-store" });
    if (response.status === 401) {
      setAuthed(false);
      return;
    }
    const payload = (await response.json()) as {
      pandals?: Pandal[];
      source?: string;
      database?: boolean;
    };
    setPandals(payload.pandals ?? []);
    setSource(payload.source ?? "seed");
    setDatabase(Boolean(payload.database));
    setAuthed(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const login = useCallback(async () => {
    setLoginError(null);
    setBusy(true);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (response.ok) {
      setPassword("");
      await load();
      return;
    }
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoginError(
      payload.error === "admin-not-configured"
        ? lang === "bn"
          ? "Vercel-এ ADMIN_PASSWORD সেট করা নেই"
          : "ADMIN_PASSWORD is not set in the environment"
        : lang === "bn"
          ? "পাসওয়ার্ড ঠিক নয়"
          : "Wrong password",
    );
  }, [load, password, lang]);

  const save = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/admin/pandals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        lat: Number(form.lat),
        lng: Number(form.lng),
        established: form.established ? Number(form.established) : null,
      }),
    });
    setBusy(false);
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (response.ok) {
      setMessage(lang === "bn" ? "সেভ হয়েছে" : "Saved");
      setForm(EMPTY_FORM);
      invalidatePandals();
      await load();
      return;
    }
    setMessage(
      payload.error === "database-not-configured"
        ? lang === "bn"
          ? "আগে ডেটাবেস তৈরি করুন"
          : "Initialise the database first"
        : `${lang === "bn" ? "সেভ হয়নি" : "Could not save"}: ${payload.error ?? "unknown"}`,
    );
  }, [form, load, lang]);

  const remove = useCallback(
    async (slug: string) => {
      if (!window.confirm(lang === "bn" ? `"${slug}" মুছে ফেলবেন?` : `Delete "${slug}"?`)) return;
      setBusy(true);
      const response = await fetch(`/api/admin/pandals?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      setBusy(false);
      setMessage(response.ok ? (lang === "bn" ? "মুছে ফেলা হয়েছে" : "Deleted") : "Failed");
      invalidatePandals();
      await load();
    },
    [lang, load],
  );

  const setup = useCallback(async () => {
    setBusy(true);
    const response = await fetch("/api/admin/setup", { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as {
      pandals?: number;
      facilities?: number;
      error?: string;
    };
    setBusy(false);
    setMessage(
      response.ok
        ? lang === "bn"
          ? `ডেটাবেস তৈরি — ${payload.pandals} প্যান্ডেল, ${payload.facilities} জায়গা`
          : `Database ready — ${payload.pandals} pandals, ${payload.facilities} facilities`
        : `${lang === "bn" ? "ব্যর্থ" : "Failed"}: ${payload.error ?? "unknown"}`,
    );
    invalidatePandals();
    await load();
  }, [lang, load]);

  const logout = useCallback(async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setPandals([]);
  }, []);

  const pickerPandals = useMemo<Pandal[]>(
    () => [
      {
        slug: "preview",
        name_en: form.name_en || "Preview",
        name_bn: form.name_bn || "প্রিভিউ",
        category: form.category,
        area_en: form.area_en,
        area_bn: form.area_bn,
        lat: Number(form.lat) || 22.8878,
        lng: Number(form.lng) || 88.4183,
      },
    ],
    [form.category, form.lat, form.lng, form.name_en, form.name_bn, form.area_en, form.area_bn],
  );

  if (authed === null) {
    return (
      <div className="mx-auto w-full max-w-2xl px-3 pt-8 pb-28">
        <p className="text-center text-[13px] text-white/60">…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="mx-auto w-full max-w-2xl px-3 pt-8 pb-28">
        <div className="glass mx-auto max-w-sm rounded-3xl p-5">
          <h1 className="text-[17px] font-semibold text-white">
            {lang === "bn" ? "প্যান্ডেল এডিটর" : "Pandal editor"}
          </h1>
          <p className="mt-1 text-[12px] text-white/55">
            {lang === "bn"
              ? "আয়োজক দলের পাসওয়ার্ড দিন (Vercel-এর ADMIN_PASSWORD)।"
              : "Enter the organiser password (ADMIN_PASSWORD in the environment)."}
          </p>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void login();
            }}
            className="mt-3 w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2.5 text-[14px] focus:border-gold/50 focus:outline-none"
            placeholder="••••••••"
          />
          {loginError ? <p className="mt-2 text-[12px] text-large">{loginError}</p> : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void login()}
            className="liquid-press glow-gold mt-3 w-full rounded-2xl bg-gold px-4 py-3 text-[13.5px] font-semibold text-ink disabled:opacity-60"
          >
            {lang === "bn" ? "প্রবেশ করুন" : "Unlock"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-3 pt-4 pb-28">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[19px] font-bold text-white">
          {lang === "bn" ? "প্যান্ডেল এডিটর" : "Pandal editor"}
        </h1>
        <button
          type="button"
          onClick={() => void logout()}
          className="liquid-press rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[12px]"
        >
          {lang === "bn" ? "লগ আউট" : "Sign out"}
        </button>
      </div>

      <div className="glass mt-3 rounded-2xl p-3 text-[12px] text-white/70">
        <p>
          {database
            ? lang === "bn"
              ? "✅ Neon ডেটাবেস যুক্ত — পরিবর্তন সঙ্গে সঙ্গে লাইভ"
              : "✅ Neon database connected — edits go live immediately"
            : lang === "bn"
              ? "⚠️ DATABASE_URL নেই — এখন শুধু বিল্ট-ইন ডেটা দেখানো হচ্ছে"
              : "⚠️ DATABASE_URL missing — showing bundled data only"}
        </p>
        <p className="mt-1 text-white/45">
          {t_source(source, lang)} · {pandals.length} {lang === "bn" ? "প্যান্ডেল" : "pandals"}
        </p>
        {!database ? null : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void setup()}
            className="liquid-press mt-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-1.5 text-[12px] font-medium text-gold disabled:opacity-60"
          >
            {lang === "bn" ? "টেবিল ও সিড ডেটা তৈরি করুন" : "Create tables & seed data"}
          </button>
        )}
      </div>

      {message ? <p className="mt-2 text-[12.5px] text-gold">{message}</p> : null}

      <section className="glass mt-3 rounded-3xl p-4">
        <h2 className="text-[14px] font-semibold text-white">
          {form.slug ? (lang === "bn" ? "সম্পাদনা" : "Edit") : lang === "bn" ? "নতুন প্যান্ডেল" : "New pandal"}
        </h2>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <Field label="Slug (english-key)" value={form.slug} onChange={(value) => setForm((f) => ({ ...f, slug: value }))} placeholder="naihati-new-star-club" />
          <label className="block">
            <span className="text-[11.5px] text-white/55">Category</span>
            <select
              value={form.category}
              onChange={(event) =>
                setForm((f) => ({ ...f, category: event.target.value as PandalCategory }))
              }
              className="mt-1 w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-[13px] focus:border-gold/50 focus:outline-none"
            >
              {PANDAL_CATEGORIES.map((category) => (
                <option key={category} value={category} className="bg-ink">
                  {category}
                </option>
              ))}
            </select>
          </label>
          <Field label="Name (English)" value={form.name_en} onChange={(value) => setForm((f) => ({ ...f, name_en: value }))} />
          <Field label="নাম (বাংলা)" value={form.name_bn} onChange={(value) => setForm((f) => ({ ...f, name_bn: value }))} />
          <Field label="Area (English)" value={form.area_en} onChange={(value) => setForm((f) => ({ ...f, area_en: value }))} />
          <Field label="এলাকা (বাংলা)" value={form.area_bn} onChange={(value) => setForm((f) => ({ ...f, area_bn: value }))} />
          <Field label="Latitude" value={form.lat} onChange={(value) => setForm((f) => ({ ...f, lat: value }))} />
          <Field label="Longitude" value={form.lng} onChange={(value) => setForm((f) => ({ ...f, lng: value }))} />
          <Field label="Committee / club" value={form.committee} onChange={(value) => setForm((f) => ({ ...f, committee: value }))} />
          <Field label="Established (year)" value={form.established} onChange={(value) => setForm((f) => ({ ...f, established: value }))} />
          <Field label="Landmark (English)" value={form.landmark_en} onChange={(value) => setForm((f) => ({ ...f, landmark_en: value }))} />
          <Field label="চিহ্ন (বাংলা)" value={form.landmark_bn} onChange={(value) => setForm((f) => ({ ...f, landmark_bn: value }))} />
          <div className="sm:col-span-2">
            <Field label="Description (English)" value={form.description_en} onChange={(value) => setForm((f) => ({ ...f, description_en: value }))} textarea />
          </div>
          <div className="sm:col-span-2">
            <Field label="বর্ণনা (বাংলা)" value={form.description_bn} onChange={(value) => setForm((f) => ({ ...f, description_bn: value }))} textarea />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-[12.5px] text-white/70">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) => setForm((f) => ({ ...f, featured: event.target.checked }))}
            />
            {lang === "bn" ? "জনপ্রিয় হিসেবে দেখান" : "Mark as must-visit"}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.verified}
              onChange={(event) => setForm((f) => ({ ...f, verified: event.target.checked }))}
            />
            {lang === "bn" ? "নাম ও পিন যাচাই করা হয়েছে" : "Name and pin verified locally"}
          </label>
        </div>

        <div className="mt-3">
          <p className="text-[11.5px] text-white/55">
            {lang === "bn" ? "ম্যাপে ক্লিক করে পিন বসান" : "Click the map to place the pin"}
          </p>
          <div className="mt-1.5 h-56 w-full overflow-hidden rounded-2xl border border-white/12">
            <LeafletCanvas
              className="h-full w-full"
              pandals={pickerPandals}
              activeSlug="preview"
              center={{ lat: Number(form.lat) || 22.8878, lng: Number(form.lng) || 88.4183 }}
              zoom={16}
              nightMode
              onMapClick={(point) =>
                setForm((f) => ({ ...f, lat: point.lat.toFixed(6), lng: point.lng.toFixed(6) }))
              }
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="liquid-press glow-gold flex-1 rounded-2xl bg-gold px-4 py-3 text-[13.5px] font-semibold text-ink disabled:opacity-60"
          >
            {lang === "bn" ? "সেভ করুন" : "Save pandal"}
          </button>
          <button
            type="button"
            onClick={() => setForm(EMPTY_FORM)}
            className="liquid-press rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-[13.5px]"
          >
            {lang === "bn" ? "ফাঁকা করুন" : "Clear form"}
          </button>
        </div>
      </section>

      <section className="mt-4">
        <h2 className="text-[14px] font-semibold text-white">
          {lang === "bn" ? "সব প্যান্ডেল" : "All pandals"} ({pandals.length})
        </h2>
        <ul className="mt-2 space-y-1.5">
          {pandals.map((pandal) => (
            <li
              key={pandal.slug}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-white/90">
                  {pandal.name_en}
                  {pandal.verified === false ? (
                    <span className="ml-2 text-[10px] text-white/45">
                      {lang === "bn" ? "আনুমানিক" : "approximate"}
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-[11px] text-white/45">
                  {pandal.category} · {pandal.lat.toFixed(5)}, {pandal.lng.toFixed(5)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForm(toForm(pandal))}
                className="liquid-press shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11.5px]"
              >
                {lang === "bn" ? "সম্পাদনা" : "Edit"}
              </button>
              <button
                type="button"
                onClick={() => void remove(pandal.slug)}
                className="liquid-press shrink-0 rounded-full border border-large/40 bg-large/10 px-3 py-1.5 text-[11.5px] text-large"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function t_source(source: string, lang: "bn" | "en"): string {
  if (source === "database") return lang === "bn" ? "সোর্স: Neon ডেটাবেস" : "Source: Neon database";
  return lang === "bn" ? "সোর্স: রেপোতে থাকা সিড ডেটা" : "Source: bundled seed data";
}
