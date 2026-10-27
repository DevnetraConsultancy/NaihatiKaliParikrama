"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { translate } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "bn",
  setLang: () => {},
  toggle: () => {},
  t: (key: string) => key,
});

const STORAGE_KEY = "nkp_lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Bengali is the default for local visitors; an explicit choice is remembered.
  const [lang, setLangState] = useState<Lang>("bn");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "bn" || saved === "en") setLangState(saved);
    } catch {
      // storage blocked (private mode) — keep the default
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dataset.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    setLangState((current) => {
      const next: Lang = current === "bn" ? "en" : "bn";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, toggle, t: (key: string) => translate(key, lang) }),
    [lang, setLang, toggle],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): LanguageContextValue {
  return useContext(LanguageContext);
}
