import type { MapCoordinate } from "@/src/constants/map";

const EARTH_RADIUS_METERS = 6_371_000;

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in meters (haversine). */
export function haversineMeters(from: MapCoordinate, to: MapCoordinate): number {
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function formatDistanceMeters(meters: number, locale: string): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  const value = km.toLocaleString(locale === "es" ? "es-ES" : "en-US", {
    maximumFractionDigits: km >= 10 ? 0 : 1,
  });
  return `${value} km`;
}
