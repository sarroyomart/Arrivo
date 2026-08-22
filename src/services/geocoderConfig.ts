import AsyncStorage from "@react-native-async-storage/async-storage";

import { APP_USER_AGENT, LEGAL_URLS, STORAGE_KEYS } from "@/src/constants";

export type GeocoderConfig = {
  nominatimBaseUrl: string;
  userAgent: string;
};

export const DEFAULT_GEOCODER_CONFIG: GeocoderConfig = {
  nominatimBaseUrl: "https://nominatim.openstreetmap.org",
  userAgent: APP_USER_AGENT,
};

let cached: GeocoderConfig = DEFAULT_GEOCODER_CONFIG;
let loadPromise: Promise<GeocoderConfig> | null = null;

function parseConfig(value: unknown): GeocoderConfig | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const base =
    typeof record.nominatimBaseUrl === "string" ? record.nominatimBaseUrl.trim() : "";
  const userAgent =
    typeof record.userAgent === "string" ? record.userAgent.trim() : "";
  if (!base.startsWith("https://") || base.length > 200) {
    return null;
  }
  return {
    nominatimBaseUrl: base.replace(/\/+$/, ""),
    userAgent: userAgent || DEFAULT_GEOCODER_CONFIG.userAgent,
  };
}

export function getGeocoderConfigSync(): GeocoderConfig {
  return cached;
}

/**
 * Loads a remote geocoder endpoint so OSMF can ask us to switch Nominatim
 * without an app store update. Falls back to the bundled default.
 */
export async function ensureGeocoderConfig(): Promise<GeocoderConfig> {
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.geocoderConfig);
      if (stored) {
        const parsed = parseConfig(JSON.parse(stored) as unknown);
        if (parsed) {
          cached = parsed;
        }
      }
    } catch {
      // Keep defaults if local cache is corrupt.
    }

    try {
      const response = await fetch(LEGAL_URLS.geocoderConfig, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": DEFAULT_GEOCODER_CONFIG.userAgent,
          Referer: LEGAL_URLS.github,
        },
      });
      if (response.ok) {
        const parsed = parseConfig((await response.json()) as unknown);
        if (parsed) {
          cached = parsed;
          await AsyncStorage.setItem(STORAGE_KEYS.geocoderConfig, JSON.stringify(parsed));
        }
      }
    } catch {
      // Offline or unpublished config file: bundled Nominatim URL stays in use.
    }

    return cached;
  })();

  return loadPromise;
}
