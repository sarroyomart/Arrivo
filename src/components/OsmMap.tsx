import { type ReactNode, type Ref } from "react";
import { Platform, View } from "react-native";
import {
  Camera,
  Map,
  UserLocation,
  type CameraRef,
} from "@maplibre/maplibre-react-native";

import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  OSM_STYLE_URL,
  type MapCoordinate,
} from "@/src/constants/map";
import { useColorScheme } from "@/src/hooks/useColorScheme";

type OsmMapProps = {
  children?: ReactNode;
  center?: MapCoordinate;
  zoom?: number;
  onPress?: (coordinate: MapCoordinate) => void;
  onMapReady?: () => void;
  showsUserLocation?: boolean;
  className?: string;
  cameraRef?: Ref<CameraRef>;
};

/**
 * OpenStreetMap canvas (MapLibre + OpenFreeMap). Requires a development build;
 * not available in Expo Go. Does not use Google Maps (no API key).
 */
export function OsmMap({
  children,
  center,
  zoom = DEFAULT_MAP_ZOOM,
  onPress,
  onMapReady,
  showsUserLocation = false,
  className,
  cameraRef,
}: OsmMapProps) {
  const { colorScheme } = useColorScheme();
  const mapStyle =
    colorScheme === "dark" ? OSM_STYLE_URL.dark : OSM_STYLE_URL.light;
  const mapCenter: [number, number] = center
    ? [center.longitude, center.latitude]
    : DEFAULT_MAP_CENTER;

  if (Platform.OS === "web") {
    return <View className={className ?? "flex-1 bg-map"} />;
  }

  return (
    <View className={className ?? "flex-1 overflow-hidden bg-map"}>
      <Map
        style={{ flex: 1 }}
        mapStyle={mapStyle}
        attribution
        logo={false}
        onDidFinishLoadingMap={onMapReady ? () => onMapReady() : undefined}
        onPress={
          onPress
            ? (event) => {
                const [longitude, latitude] = event.nativeEvent.lngLat;
                onPress({ latitude, longitude });
              }
            : undefined
        }
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: mapCenter, zoom }}
        />
        {showsUserLocation ? (
          <UserLocation animated accuracy minDisplacement={8} />
        ) : null}
        {children}
      </Map>
    </View>
  );
}
