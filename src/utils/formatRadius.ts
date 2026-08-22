import type { Locale, Translate } from "@/src/i18n";

export function formatRadius(
  meters: number,
  t: Translate,
  locale: Locale,
): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    const value = km.toLocaleString(locale === "es" ? "es-ES" : "en-US", {
      maximumFractionDigits: meters % 1000 === 0 ? 0 : 1,
    });
    return t("radius.kilometers", { value });
  }

  return t("alarm.radiusMeters", { meters });
}
