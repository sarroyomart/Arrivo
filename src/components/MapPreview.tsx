import { Ionicons } from "@expo/vector-icons";
import { Platform, Text, View } from "react-native";
import { Marker } from "@maplibre/maplibre-react-native";

import { AlarmMapMarker } from "@/src/components/AlarmMapMarker";
import { GeofenceLayer } from "@/src/components/GeofenceLayer";
import { OsmAttribution } from "@/src/components/OsmAttribution";
import { OsmMap } from "@/src/components/OsmMap";
import {
  isValidCoordinate,
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
      pointerEvents="box-none"
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
        <View pointerEvents="none" className="flex-1">
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
        </View>
      )}
      {hasLocation && Platform.OS !== "web" ? (
        <View
          pointerEvents="auto"
          className="absolute bottom-space-1 right-space-2 rounded-control bg-card px-space-2 py-space-1"
        >
          <OsmAttribution />
        </View>
      ) : null}
    </View>
  );
}
