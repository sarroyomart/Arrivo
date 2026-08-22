import { Ionicons } from "@expo/vector-icons";
import { Platform, Text, View } from "react-native";
import { Marker } from "@maplibre/maplibre-react-native";

import { GeofenceLayer } from "@/src/components/GeofenceLayer";
import { AlarmMapMarker } from "@/src/components/AlarmMapMarker";
import { OsmMap } from "@/src/components/OsmMap";
import {
  isValidCoordinate,
  OSM_ATTRIBUTION,
  zoomForRadius,
} from "@/src/constants";
import { usePalette } from "@/src/hooks/usePalette";
import { useTranslation } from "@/src/i18n";
import type { AlarmIconType } from "@/src/types/alarm";
import { cn } from "@/src/utils/cn";

export type MapPreviewProps = {
  latitude?: number;
  longitude?: number;
  radius: number;
  color: string;
  icon?: AlarmIconType;
  className?: string;
  flush?: boolean;
};

export function MapPreview({
  latitude,
  longitude,
  radius,
  color,
  icon,
  className,
  flush = false,
}: MapPreviewProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const hasLocation =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    isValidCoordinate(latitude, longitude);
  const coordinate = hasLocation ? { latitude, longitude } : null;

  return (
    <View
      pointerEvents="none"
      className={cn(
        "h-36 overflow-hidden bg-map",
        flush ? "rounded-none" : "rounded-card shadow-map",
        className,
      )}
    >
      {!coordinate || Platform.OS === "web" ? (
        <View className="flex-1 items-center justify-center bg-map px-space-4">
          <View className="h-10 w-10 items-center justify-center rounded-pill bg-primary-container">
            <Ionicons name="map-outline" size={20} color={palette.primary} />
          </View>
          <Text className="typo-caption mt-space-2 text-center">
            {t("screens.alarm.selectOnMap")}
          </Text>
        </View>
      ) : (
        <OsmMap
          center={coordinate}
          zoom={zoomForRadius(radius)}
          className="flex-1"
        >
          <GeofenceLayer
            latitude={coordinate.latitude}
            longitude={coordinate.longitude}
            radius={radius}
            color={color}
          />
          <Marker
            id="preview-pin"
            lngLat={[coordinate.longitude, coordinate.latitude]}
            anchor="center"
          >
            <AlarmMapMarker color={color} icon={icon} size={28} />
          </Marker>
        </OsmMap>
      )}
      {hasLocation && Platform.OS !== "web" ? (
        <View className="absolute bottom-space-1 right-space-2 rounded-control bg-card px-space-2 py-space-1">
          <Text className="typo-caption">{OSM_ATTRIBUTION}</Text>
        </View>
      ) : null}
    </View>
  );
}
