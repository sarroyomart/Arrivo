import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";

import {
  GEOFENCE_FILL_OPACITY,
  geofenceCirclePolygon,
} from "@/src/constants";

type GeofenceLayerProps = {
  id?: string;
  latitude: number;
  longitude: number;
  radius: number;
  color: string;
};

/**
 * Geofence disc on the OSM map: fill at 15% + stroke, matching Penpot MapPreview.
 */
export function GeofenceLayer({
  id = "geofence",
  latitude,
  longitude,
  radius,
  color,
}: GeofenceLayerProps) {
  const data = {
    type: "Feature" as const,
    properties: {},
    geometry: geofenceCirclePolygon(longitude, latitude, radius),
  };

  return (
    <GeoJSONSource id={`${id}-source`} data={data}>
      <Layer
        type="fill"
        id={`${id}-fill`}
        paint={{
          "fill-color": color,
          "fill-opacity": GEOFENCE_FILL_OPACITY,
        }}
      />
      <Layer
        type="line"
        id={`${id}-stroke`}
        paint={{
          "line-color": color,
          "line-width": 2,
        }}
      />
    </GeoJSONSource>
  );
}
