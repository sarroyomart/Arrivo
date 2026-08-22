/**
 * OpenStreetMap via MapLibre + OpenFreeMap.
 * Vector tiles, no API key, no monthly quota.
 * https://openfreemap.org/quick_start/
 */
export const OSM_STYLE_URL = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

/** Attribution shown over MapLibre canvases. */
export const OSM_ATTRIBUTION = "© OpenStreetMap";

/** MapLibre Camera uses [longitude, latitude]. */
export const DEFAULT_MAP_CENTER: [number, number] = [-3.7038, 40.4168];
export const DEFAULT_MAP_ZOOM = 12;

/** Approximate MapLibre zoom so a geofence radius fills the viewport. */
export function zoomForRadius(radiusMeters: number): number {
  const zoom = 16.5 - Math.log2(Math.max(radiusMeters, 100) / 100);
  return Math.min(17, Math.max(11, zoom));
}

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export function isValidCoordinate(
  latitude?: number | null,
  longitude?: number | null,
): boolean {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export const DEFAULT_COORDINATE: MapCoordinate = {
  latitude: DEFAULT_MAP_CENTER[1],
  longitude: DEFAULT_MAP_CENTER[0],
};

export type GeoPolygon = {
  type: "Polygon";
  coordinates: [number, number][][];
};

/**
 * Approximate a geofence (radius in meters) as a GeoJSON polygon
 * for MapLibre fill/line layers.
 */
export function geofenceCirclePolygon(
  longitude: number,
  latitude: number,
  radiusMeters: number,
  steps = 64,
): GeoPolygon {
  const coordinates: [number, number][] = [];
  const earthRadius = 6378137;
  const latRad = (latitude * Math.PI) / 180;
  const metersToLat = 1 / ((Math.PI / 180) * earthRadius);
  const metersToLng = 1 / ((Math.PI / 180) * earthRadius * Math.cos(latRad));

  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * 2 * Math.PI;
    coordinates.push([
      longitude + radiusMeters * Math.cos(angle) * metersToLng,
      latitude + radiusMeters * Math.sin(angle) * metersToLat,
    ]);
  }

  return { type: "Polygon", coordinates: [coordinates] };
}
