import { getLocales } from "expo-localization";

import { isValidCoordinate, LEGAL_URLS, type MapCoordinate } from "@/src/constants";
import type { Locale } from "@/src/i18n/types";
import {
  ensureGeocoderConfig,
  getGeocoderConfigSync,
} from "@/src/services/geocoderConfig";
import { haversineMeters } from "@/src/utils/geo";

const MIN_REQUEST_INTERVAL_MS = 1000;
const SEARCH_CACHE_LIMIT = 40;
const REQUEST_TIMEOUT_MS = 8000;
const SEARCH_LIMIT = 7;
/** ~0.5° (~55 km) box: prefer nearby matches without hiding other areas. */
const SEARCH_VIEWBOX_DEGREES = 0.5;
/** Drop "same street number" hits from other cities when we know where the user is. */
const LOCAL_RESULT_MAX_KM = 25;

export type NominatimPlace = {
  label: string;
  primaryLabel: string;
  secondaryLabel: string;
  lat: number;
  lon: number;
  houseNumber?: string;
};

export type SearchPlacesOptions = {
  language: Locale;
  /** GPS of the user; used as viewbox bias (does not exclude other areas). */
  userLat?: number | null;
  userLon?: number | null;
  proximity?: MapCoordinate | null;
};

type NominatimAddress = {
  house_number?: unknown;
  road?: unknown;
  pedestrian?: unknown;
  footway?: unknown;
  neighbourhood?: unknown;
  suburb?: unknown;
  city?: unknown;
  town?: unknown;
  village?: unknown;
  municipality?: unknown;
  county?: unknown;
  state?: unknown;
  postcode?: unknown;
};

type NominatimSearchItem = {
  display_name?: unknown;
  name?: unknown;
  lat?: unknown;
  lon?: unknown;
  place_rank?: unknown;
  importance?: unknown;
  type?: unknown;
  class?: unknown;
  address?: NominatimAddress;
  geojson?: unknown;
};

type NominatimReverseResult = {
  display_name?: unknown;
};

type ParsedAddressQuery = {
  housenumber: string;
  street: string;
  city?: string;
};

type RankedPlace = NominatimPlace & {
  line?: [number, number][];
};

let lastRequestAt = 0;
let requestChain: Promise<void> = Promise.resolve();
const searchCache = new Map<string, NominatimPlace[]>();
const reverseCache = new Map<string, string>();

function rememberSearch(key: string, places: NominatimPlace[]): void {
  searchCache.set(key, places);
  if (searchCache.size > SEARCH_CACHE_LIMIT) {
    const first = searchCache.keys().next().value;
    if (first !== undefined) {
      searchCache.delete(first);
    }
  }
}

/**
 * Prefer the country's local names (Calle de Alcalá, España) over English
 * translations. The app locale is a fallback for country/admin labels.
 */
function nominatimLanguage(appLocale: Locale): string {
  const region = getLocales()[0]?.regionCode?.toUpperCase() ?? "";
  const fromRegion: Record<string, string> = {
    ES: "es",
    MX: "es",
    AR: "es",
    CO: "es",
    CL: "es",
    PE: "es",
    UY: "es",
    PY: "es",
    BO: "es",
    EC: "es",
    VE: "es",
    CU: "es",
    CR: "es",
    PA: "es",
    GT: "es",
    HN: "es",
    NI: "es",
    SV: "es",
    DO: "es",
    PR: "es",
    US: "en",
    GB: "en",
    AU: "en",
    NZ: "en",
    IE: "en",
    PT: "pt",
    BR: "pt",
    FR: "fr",
    DE: "de",
    AT: "de",
    IT: "it",
    NL: "nl",
    PL: "pl",
  };
  const regional = fromRegion[region];
  if (regional && regional !== appLocale) {
    return `${regional},${appLocale}`;
  }
  return regional ?? appLocale;
}

function parseCoordinate(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeHouse(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

function normalizePlaceText(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeStreetName(value: string): string {
  return normalizePlaceText(value)
    .replace(
      /\b(calle|carrer|avenida|avda|av|plaza|placa|paseo|passeig|ronda|camino|travesia|carretera|ctra|rúa|rua|de|del|de la|de las|de los|la|las|los|el)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function citiesMatch(wanted: string, haystack: string): boolean {
  const needle = normalizePlaceText(wanted);
  const hay = normalizePlaceText(haystack);
  return needle.length > 0 && hay.includes(needle);
}

function streetsMatch(wanted: string, candidate: string): boolean {
  const a = normalizeStreetName(wanted);
  const b = normalizeStreetName(candidate);
  if (!a || !b) {
    return false;
  }
  return a === b || a.includes(b) || b.includes(a);
}

async function throttle(): Promise<void> {
  const wait = MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();
}

async function nominatimFetch(url: string, language: string): Promise<Response> {
  const run = requestChain.then(async () => {
    await throttle();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      return await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Accept-Language": language,
          "User-Agent": getGeocoderConfigSync().userAgent,
          Referer: LEGAL_URLS.github,
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  });

  requestChain = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
}

function resolveUserCoordinate(options: SearchPlacesOptions): MapCoordinate | null {
  if (isValidCoordinate(options.userLat, options.userLon)) {
    return { latitude: options.userLat!, longitude: options.userLon! };
  }
  if (
    options.proximity &&
    isValidCoordinate(options.proximity.latitude, options.proximity.longitude)
  ) {
    return options.proximity;
  }
  return null;
}

/**
 * Nominatim viewbox is `left,top,right,bottom` (min lon, max lat, max lon, min lat).
 */
function viewboxAround(proximity: MapCoordinate): string {
  const d = SEARCH_VIEWBOX_DEGREES;
  const left = proximity.longitude - d;
  const right = proximity.longitude + d;
  const top = Math.min(90, proximity.latitude + d);
  const bottom = Math.max(-90, proximity.latitude - d);
  return `${left},${top},${right},${bottom}`;
}

function normalizeStreetQuery(query: string): string {
  return query
    .replace(/\s+/g, " ")
    .replace(/\b(?:n[ºo°]?\.?|núm(?:ero)?\.?|num(?:ero)?\.?|#)\s*/gi, "")
    .replace(/\bC\/\s*/gi, "Calle ")
    .replace(/\bCl\.\s*/gi, "Calle ")
    .replace(/\bAvda\.?\s+/gi, "Avenida ")
    .replace(/\bAv\.\s+/gi, "Avenida ")
    .replace(/\bPza\.?\s+/gi, "Plaza ")
    .trim();
}

function parseAddressQuery(query: string): ParsedAddressQuery | null {
  const trimmed = normalizeStreetQuery(query);
  if (trimmed.length < 3) {
    return null;
  }

  let city: string | undefined;
  let rest = trimmed;
  const commaParts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (commaParts.length >= 2) {
    const last = commaParts[commaParts.length - 1] ?? "";
    const head = commaParts.slice(0, -1).join(" ");
    if (/^\d+[A-Za-z]?$/.test(last)) {
      rest = `${head} ${last}`.trim();
    } else if (!/\d/.test(last) && /\d/.test(head)) {
      city = last;
      rest = head;
    }
  }

  const streetNumberCity = rest.match(
    /^(.*[^\d\s])\s+(\d+[A-Za-z]?)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ].+)$/u,
  );
  if (streetNumberCity?.[1] && streetNumberCity[2] && streetNumberCity[3]) {
    return {
      housenumber: streetNumberCity[2],
      street: streetNumberCity[1].trim(),
      city: city ?? streetNumberCity[3].trim(),
    };
  }

  const atEnd = rest.match(/^(.*[^\d\s])\s+(\d+[A-Za-z]?)$/u);
  if (atEnd?.[1] && atEnd[2] && atEnd[1].trim().length >= 2) {
    return { housenumber: atEnd[2], street: atEnd[1].trim(), city };
  }

  const atStart = rest.match(/^(\d+[A-Za-z]?)\s+(.+)$/u);
  if (atStart?.[1] && atStart[2] && /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(atStart[2])) {
    return { housenumber: atStart[1], street: atStart[2].trim(), city };
  }

  return null;
}

function streetName(address: NominatimAddress): string {
  return asText(address.road) || asText(address.pedestrian) || asText(address.footway);
}

function locality(address: NominatimAddress): string {
  return (
    asText(address.city) ||
    asText(address.town) ||
    asText(address.village) ||
    asText(address.municipality)
  );
}

function formatPlaceLabel(item: NominatimSearchItem): {
  label: string;
  primaryLabel: string;
  secondaryLabel: string;
  houseNumber?: string;
} {
  const display = asText(item.display_name);
  const address = item.address;
  const houseNumber = address ? asText(address.house_number) : "";
  const road = address ? streetName(address) : "";
  const name = asText(item.name);
  const primaryLabel =
    [road, houseNumber].filter(Boolean).join(" ") || name || shortPlaceName(display) || display;
  const area = address ? asText(address.suburb) || asText(address.neighbourhood) : "";
  const city = address ? locality(address) : "";
  const secondaryLabel = [area, city].filter(Boolean).join(", ");
  const label = [primaryLabel, secondaryLabel].filter(Boolean).join(", ") || display;

  return {
    label,
    primaryLabel,
    secondaryLabel,
    houseNumber: houseNumber || undefined,
  };
}

function parseLineCoords(value: unknown): [number, number][] | undefined {
  if (!Array.isArray(value) || value.length < 2) {
    return undefined;
  }
  const line: [number, number][] = [];
  for (const pair of value) {
    if (!Array.isArray(pair) || pair.length < 2) {
      continue;
    }
    const lon = parseCoordinate(pair[0]);
    const lat = parseCoordinate(pair[1]);
    if (lon === null || lat === null) {
      continue;
    }
    line.push([lon, lat]);
  }
  return line.length >= 2 ? line : undefined;
}

function lineLengthMeters(line: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < line.length; i += 1) {
    const prev = line[i - 1];
    const next = line[i];
    if (!prev || !next) {
      continue;
    }
    total += haversineMeters(
      { latitude: prev[1], longitude: prev[0] },
      { latitude: next[1], longitude: next[0] },
    );
  }
  return total;
}

function lineFromGeojson(geojson: unknown): [number, number][] | undefined {
  if (!geojson || typeof geojson !== "object") {
    return undefined;
  }
  const g = geojson as { type?: unknown; coordinates?: unknown };
  if (g.type === "LineString") {
    return parseLineCoords(g.coordinates);
  }
  if (g.type === "MultiLineString" && Array.isArray(g.coordinates)) {
    const lines = g.coordinates
      .map((coords) => parseLineCoords(coords))
      .filter((line): line is [number, number][] => line !== undefined);
    lines.sort((a, b) => lineLengthMeters(b) - lineLengthMeters(a));
    return lines[0];
  }
  return undefined;
}

function pointAlongLine(line: [number, number][], fraction: number): { lat: number; lon: number } {
  const t = Math.min(0.92, Math.max(0.08, fraction));
  const target = lineLengthMeters(line) * t;
  let walked = 0;
  for (let i = 1; i < line.length; i += 1) {
    const prev = line[i - 1];
    const next = line[i];
    if (!prev || !next) {
      continue;
    }
    const from = { latitude: prev[1], longitude: prev[0] };
    const to = { latitude: next[1], longitude: next[0] };
    const segment = haversineMeters(from, to);
    if (walked + segment >= target || i === line.length - 1) {
      const remain = segment === 0 ? 0 : (target - walked) / segment;
      const u = Math.min(1, Math.max(0, remain));
      return {
        lon: prev[0] + (next[0] - prev[0]) * u,
        lat: prev[1] + (next[1] - prev[1]) * u,
      };
    }
    walked += segment;
  }
  const last = line[line.length - 1] ?? line[0]!;
  return { lon: last[0], lat: last[1] };
}

function interpolateHouseOnStreet(
  line: [number, number][] | undefined,
  houseNumber: string,
  fallback: { lat: number; lon: number },
): { lat: number; lon: number } {
  if (!line || line.length < 2) {
    return fallback;
  }
  const n = Number.parseInt(houseNumber, 10);
  if (!Number.isFinite(n) || n <= 0) {
    return fallback;
  }
  const assumedMax = Math.max(40, Math.ceil(n / 20) * 20 + 20);
  return pointAlongLine(line, (n - 1) / Math.max(assumedMax - 1, 1));
}

/**
 * Use Nominatim's point (`lat`/`lon`) only — never the bounding box.
 * The bbox of a street/city is a large envelope; its corner looks like a random jump.
 */
function readPoint(item: NominatimSearchItem): { lat: number; lon: number } | null {
  const lat = parseCoordinate(item.lat);
  const lon = parseCoordinate(item.lon);
  if (lat === null || lon === null || !isValidCoordinate(lat, lon)) {
    return null;
  }
  return { lat, lon };
}

function toPlace(item: NominatimSearchItem): RankedPlace | null {
  const point = readPoint(item);
  const names = formatPlaceLabel(item);
  if (!point || !names.label) {
    return null;
  }
  return {
    ...names,
    lat: point.lat,
    lon: point.lon,
    line: lineFromGeojson(item.geojson),
  };
}

export function shortPlaceName(label: string): string {
  const [first] = label.split(",");
  return (first ?? label).trim();
}

function baseSearchParams(
  language: string,
  proximity: MapCoordinate | null,
  withGeometry: boolean,
): URLSearchParams {
  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    dedupe: "1",
    limit: String(SEARCH_LIMIT),
    "accept-language": language,
  });

  if (withGeometry) {
    params.set("polygon_geojson", "1");
  }

  if (proximity) {
    params.set("viewbox", viewboxAround(proximity));
    params.set("bounded", "0");
  }

  return params;
}

function distanceKm(place: NominatimPlace, proximity: MapCoordinate | null): number | null {
  if (!proximity) {
    return null;
  }
  return (
    haversineMeters(proximity, {
      latitude: place.lat,
      longitude: place.lon,
    }) / 1000
  );
}

function isLocallyRelevant(
  place: NominatimPlace,
  parsed: ParsedAddressQuery | null,
  proximity: MapCoordinate | null,
): boolean {
  const km = distanceKm(place, proximity);
  if (parsed?.city) {
    const haystack = `${place.secondaryLabel} ${place.label}`;
    if (citiesMatch(parsed.city, haystack)) {
      return true;
    }
    return km !== null && km <= LOCAL_RESULT_MAX_KM;
  }
  if (km !== null) {
    return km <= LOCAL_RESULT_MAX_KM;
  }
  return true;
}

function scorePlace(
  item: NominatimSearchItem,
  place: RankedPlace,
  parsed: ParsedAddressQuery | null,
  proximity: MapCoordinate | null,
): number {
  let score = 0;
  const wanted = parsed ? normalizeHouse(parsed.housenumber) : "";
  const got = place.houseNumber ? normalizeHouse(place.houseNumber) : "";
  const km = distanceKm(place, proximity);
  const cityOk = parsed?.city
    ? citiesMatch(parsed.city, `${place.secondaryLabel} ${place.label}`)
    : true;
  const streetOk = parsed ? streetsMatch(parsed.street, place.primaryLabel) : true;
  const nearby = km === null || km <= LOCAL_RESULT_MAX_KM;

  if (wanted && got && wanted === got && cityOk && nearby) {
    score += 1000;
  } else if (wanted && got && wanted === got) {
    // Same portal number on a different city's street — do not let it win.
    score -= 1500;
  } else if (got && nearby) {
    score += 120;
  }

  if (parsed && streetOk) {
    score += 300;
  }
  if (parsed?.city && cityOk) {
    score += 400;
  }

  const placeRank = parseCoordinate(item.place_rank) ?? 0;
  score += placeRank * 2;

  const kind = `${asText(item.class)}:${asText(item.type)}`;
  if (kind.includes("house") || kind.includes("building")) {
    score += nearby ? 80 : -200;
  }

  if (km !== null) {
    score += Math.max(0, 80 - km * 4);
    if (km > LOCAL_RESULT_MAX_KM) {
      score -= 800;
    }
  }

  score += (parseCoordinate(item.importance) ?? 0) * 20;
  return score;
}

function publicPlace(place: RankedPlace): NominatimPlace {
  return {
    label: place.label,
    primaryLabel: place.primaryLabel,
    secondaryLabel: place.secondaryLabel,
    lat: place.lat,
    lon: place.lon,
    houseNumber: place.houseNumber,
  };
}

function rankPlaces(
  items: NominatimSearchItem[],
  parsed: ParsedAddressQuery | null,
  proximity: MapCoordinate | null,
): RankedPlace[] {
  const scored = items
    .map((item) => {
      const place = toPlace(item);
      if (!place) {
        return null;
      }
      return { place, score: scorePlace(item, place, parsed, proximity) };
    })
    .filter((row): row is { place: RankedPlace; score: number } => row !== null)
    .sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const places: RankedPlace[] = [];
  for (const row of scored) {
    if (parsed && !isLocallyRelevant(row.place, parsed, proximity)) {
      continue;
    }
    const key = `${row.place.lat.toFixed(6)}:${row.place.lon.toFixed(6)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    places.push(row.place);
  }
  return places.slice(0, SEARCH_LIMIT);
}

async function requestPlaces(
  params: URLSearchParams,
  language: string,
  parsed: ParsedAddressQuery | null,
  proximity: MapCoordinate | null,
): Promise<RankedPlace[]> {
  const url = `${getGeocoderConfigSync().nominatimBaseUrl}/search?${params.toString()}`;
  try {
    const response = await nominatimFetch(url, language);
    if (!response.ok) {
      return [];
    }
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      return [];
    }
    return rankPlaces(payload as NominatimSearchItem[], parsed, proximity);
  } catch {
    return [];
  }
}

function hasExactLocalHouse(places: RankedPlace[], parsed: ParsedAddressQuery): boolean {
  const wanted = normalizeHouse(parsed.housenumber);
  return places.some(
    (place) =>
      place.houseNumber &&
      normalizeHouse(place.houseNumber) === wanted &&
      (!parsed.city || citiesMatch(parsed.city, `${place.secondaryLabel} ${place.label}`)),
  );
}

function withRequestedHouse(place: RankedPlace, parsed: ParsedAddressQuery): RankedPlace {
  const road =
    place.primaryLabel.replace(/\s+\d+[A-Za-z]?$/, "").trim() ||
    asText(place.primaryLabel) ||
    parsed.street;
  const point = interpolateHouseOnStreet(place.line, parsed.housenumber, {
    lat: place.lat,
    lon: place.lon,
  });
  const primaryLabel = `${road} ${parsed.housenumber}`.trim();
  const secondaryLabel = place.secondaryLabel || parsed.city || "";
  return {
    ...place,
    lat: point.lat,
    lon: point.lon,
    houseNumber: parsed.housenumber,
    primaryLabel,
    secondaryLabel,
    label: [primaryLabel, secondaryLabel].filter(Boolean).join(", "),
  };
}

function attachHouseIfMissing(places: RankedPlace[], parsed: ParsedAddressQuery): RankedPlace[] {
  if (hasExactLocalHouse(places, parsed)) {
    return places;
  }

  const streetHit =
    places.find((place) => streetsMatch(parsed.street, place.primaryLabel)) ?? places[0];
  if (!streetHit) {
    return places;
  }

  const numbered = withRequestedHouse(streetHit, parsed);
  const rest = places.filter((place) => place !== streetHit);
  return [numbered, ...rest].slice(0, SEARCH_LIMIT);
}

function mergePlaces(groups: RankedPlace[][]): RankedPlace[] {
  const seen = new Set<string>();
  const out: RankedPlace[] = [];
  for (const group of groups) {
    for (const place of group) {
      const key = `${place.lat.toFixed(6)}:${place.lon.toFixed(6)}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push(place);
    }
  }
  return out.slice(0, SEARCH_LIMIT);
}

export async function searchPlaces(
  query: string,
  options: SearchPlacesOptions,
): Promise<NominatimPlace[]> {
  try {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return [];
    }

    await ensureGeocoderConfig();
    const language = nominatimLanguage(options.language);
    const cacheKey = [
      language,
      trimmed.toLowerCase(),
      options.userLat?.toFixed(3) ?? "",
      options.userLon?.toFixed(3) ?? "",
    ].join("|");
    const cached = searchCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const proximity = resolveUserCoordinate(options);
    const parsed = parseAddressQuery(trimmed);
    const withGeometry = parsed !== null;

    const run = (mode: "structured" | "freeform"): Promise<RankedPlace[]> => {
      const params = baseSearchParams(language, proximity, withGeometry);
      if (mode === "structured" && parsed) {
        params.set("street", `${parsed.housenumber} ${parsed.street}`);
        if (parsed.city) {
          params.set("city", parsed.city);
        }
      } else {
        const q = parsed
          ? `${parsed.housenumber} ${parsed.street}${parsed.city ? `, ${parsed.city}` : ""}`
          : trimmed;
        params.set("q", q);
      }
      return requestPlaces(params, language, parsed, proximity);
    };

    if (!parsed) {
      const places = (await run("freeform")).map(publicPlace);
      rememberSearch(cacheKey, places);
      return places;
    }

    const structured = await run("structured");
    if (hasExactLocalHouse(structured, parsed)) {
      const places = structured.map(publicPlace);
      rememberSearch(cacheKey, places);
      return places;
    }

    // OSM often has the street but not the portal. Keep the local street and
    // pin the requested number on it — never promote "24" from another city.
    if (structured.length > 0) {
      const places = attachHouseIfMissing(structured, parsed).map(publicPlace);
      rememberSearch(cacheKey, places);
      return places;
    }

    const freeform = await run("freeform");
    const places = attachHouseIfMissing(mergePlaces([structured, freeform]), parsed).map(
      publicPlace,
    );
    rememberSearch(cacheKey, places);
    return places;
  } catch {
    return [];
  }
}

export async function reverseGeocode(
  lat: number,
  lon: number,
  appLocale: Locale,
): Promise<string> {
  await ensureGeocoderConfig();
  const language = nominatimLanguage(appLocale);
  const cacheKey = `${language}|${lat.toFixed(5)}|${lon.toFixed(5)}`;
  const cached = reverseCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: "jsonv2",
    addressdetails: "1",
    "accept-language": language,
  });
  const url = `${getGeocoderConfigSync().nominatimBaseUrl}/reverse?${params.toString()}`;

  try {
    const response = await nominatimFetch(url, language);
    if (!response.ok) {
      return "";
    }
    const payload = (await response.json()) as NominatimSearchItem & NominatimReverseResult;
    const label = formatPlaceLabel(payload).label || asText(payload.display_name);
    reverseCache.set(cacheKey, label);
    return label;
  } catch {
    return "";
  }
}
