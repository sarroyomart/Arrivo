import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { getLocales } from "expo-localization";

import {
  getPreferredLocale,
  setPreferredLocale,
} from "@/src/services/storage";

import { en } from "./en";
import { es } from "./es";
import type { Locale, MessageKey, Messages } from "./types";

const dictionaries: Record<Locale, Messages> = { es, en };

function deviceLocale(): Locale {
  const languageCode = getLocales()[0]?.languageCode ?? "en";
  return languageCode === "es" ? "es" : "en";
}

let activeLocale: Locale = deviceLocale();

function lookup(messages: Messages, key: MessageKey): string {
  const parts = key.split(".");
  let current: unknown = messages;

  for (const part of parts) {
    if (typeof current !== "object" || current === null || !(part in current)) {
      return key;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === "string" ? current : key;
}

function interpolate(
  value: string,
  params?: Record<string, string | number>,
): string {
  if (!params) {
    return value;
  }
  let next = value;
  for (const [name, replacement] of Object.entries(params)) {
    next = next.replaceAll(`{{${name}}}`, String(replacement));
  }
  return next;
}

export type Translate = (
  key: MessageKey,
  params?: Record<string, string | number>,
) => string;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<Locale>(activeLocale);

  useEffect(() => {
    let cancelled = false;
    void getPreferredLocale().then((stored) => {
      if (cancelled || !stored) {
        return;
      }
      activeLocale = stored;
      setLocaleState(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    activeLocale = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    activeLocale = next;
    setLocaleState(next);
    void setPreferredLocale(next);
  }, []);

  const t = useCallback<Translate>(
    (key, params) => interpolate(lookup(dictionaries[locale], key), params),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return createElement(I18nContext.Provider, { value }, children);
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within I18nProvider");
  }
  return ctx;
}

/** Standalone helper when a hook is not available (e.g. task callbacks). */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  return interpolate(lookup(dictionaries[activeLocale], key), params);
}

export function currentLocale(): Locale {
  return activeLocale;
}

export type { Locale, MessageKey, Messages };
export { en, es };
