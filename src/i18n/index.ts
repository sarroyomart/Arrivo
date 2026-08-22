import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { getLocales } from "expo-localization";

import { en } from "./en";
import { es } from "./es";
import type { Locale, MessageKey, Messages } from "./types";

const dictionaries: Record<Locale, Messages> = { es, en };

function deviceLocale(): Locale {
  const languageCode = getLocales()[0]?.languageCode ?? "en";
  return languageCode === "es" ? "es" : "en";
}

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
  const [locale, setLocale] = useState<Locale>(deviceLocale);

  const t = useCallback<Translate>(
    (key, params) => {
      let value = lookup(dictionaries[locale], key);
      if (params) {
        for (const [name, replacement] of Object.entries(params)) {
          value = value.replaceAll(`{{${name}}}`, String(replacement));
        }
      }
      return value;
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, t],
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
  let value = lookup(dictionaries[deviceLocale()], key);
  if (!params) {
    return value;
  }
  return value.replace(
    /\{\{(\w+)\}\}/g,
    (_, name: string) => String(params[name] ?? ""),
  );
}

export function currentLocale(): Locale {
  return deviceLocale();
}

export type { Locale, MessageKey, Messages };
export { en, es };
