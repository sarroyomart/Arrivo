import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Text,
  View,
} from "react-native";
import { Marker, type CameraRef } from "@maplibre/maplibre-react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AlarmMapMarker } from "@/src/components/AlarmMapMarker";
import { Button } from "@/src/components/Button";
import { GeofenceLayer } from "@/src/components/GeofenceLayer";
import { IconButton } from "@/src/components/IconButton";
import { LocationSearchBar } from "@/src/components/LocationSearchBar";
import { OsmMap } from "@/src/components/OsmMap";
import {
  DEFAULT_COORDINATE,
  DEFAULT_ZONE_COLOR,
  isValidCoordinate,
  OSM_ATTRIBUTION,
  RADIUS_DEFAULT_METERS,
  zoomForRadius,
  type MapCoordinate,
} from "@/src/constants";
import { usePalette } from "@/src/hooks/usePalette";
import { useTranslation } from "@/src/i18n";
import { setMapPickerResult } from "@/src/services/mapPickerResult";
import { reverseGeocode, type NominatimPlace } from "@/src/services/nominatim";
import { alarmIconOf, type AlarmIconType } from "@/src/types/alarm";

function parseNumberParam(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw == null || raw === "") {
    return undefined;
  }
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseStringParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

function toMapCoordinate(
  coords: { latitude: number; longitude: number } | null | undefined,
): MapCoordinate | null {
  if (!coords || !isValidCoordinate(coords.latitude, coords.longitude)) {
    return null;
  }
  return { latitude: coords.latitude, longitude: coords.longitude };
}

async function readUserCoordinate(): Promise<MapCoordinate | null> {
  const last = toMapCoordinate((await Location.getLastKnownPositionAsync())?.coords);

  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("location-timeout")), 8_000);
      }),
    ]);
    return toMapCoordinate(position.coords) ?? last;
  } catch {
    return last;
  }
}

export default function MapPickerScreen() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = usePalette();
  const params = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    radius?: string;
    color?: string;
    icon?: string;
  }>();

  const latParam = parseStringParam(params.lat);
  const lngParam = parseStringParam(params.lng);
  const initialCoordinate = useMemo(() => {
    if (latParam == null || lngParam == null) {
      return null;
    }
    const lat = Number.parseFloat(latParam);
    const lng = Number.parseFloat(lngParam);
    if (!isValidCoordinate(lat, lng)) {
      return null;
    }
    return { latitude: lat, longitude: lng };
  }, [latParam, lngParam]);

  const radius = parseNumberParam(params.radius) ?? RADIUS_DEFAULT_METERS;
  const color = parseStringParam(params.color) ?? DEFAULT_ZONE_COLOR;
  const icon: AlarmIconType = alarmIconOf(parseStringParam(params.icon));
  const zoom = zoomForRadius(radius);

  const cameraRef = useRef<CameraRef>(null);
  const reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapReadyRef = useRef(false);
  const pendingCenterRef = useRef<MapCoordinate | null>(null);
  const ignoreMapPressUntil = useRef(0);

  const [coordinate, setCoordinate] = useState<MapCoordinate>(
    initialCoordinate ?? DEFAULT_COORDINATE,
  );
  const [userCoordinate, setUserCoordinate] = useState<MapCoordinate | null>(null);
  const [placeName, setPlaceName] = useState("");
  const [picked, setPicked] = useState(initialCoordinate !== null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (initialCoordinate) {
      void reverseGeocode(
        initialCoordinate.latitude,
        initialCoordinate.longitude,
        locale,
      ).then(setPlaceName);
    }
    return () => {
      if (reverseTimer.current) {
        clearTimeout(reverseTimer.current);
      }
    };
  }, [initialCoordinate, locale]);

  const animateTo = useCallback(
    (next: MapCoordinate, immediate = false) => {
      if (!mapReadyRef.current) {
        pendingCenterRef.current = next;
        return;
      }
      const center: [number, number] = [next.longitude, next.latitude];
      if (immediate) {
        cameraRef.current?.jumpTo({
          center,
          zoom: Math.max(zoom, 16),
        });
        return;
      }
      cameraRef.current?.easeTo({
        center,
        zoom,
        duration: 350,
      });
    },
    [zoom],
  );

  const onMapReady = useCallback(() => {
    mapReadyRef.current = true;
    const pending = pendingCenterRef.current;
    if (!pending) {
      return;
    }
    pendingCenterRef.current = null;
    cameraRef.current?.easeTo({
      center: [pending.longitude, pending.latitude],
      zoom,
      duration: 0,
    });
  }, [zoom]);

  const applyCoordinate = useCallback(
    (next: MapCoordinate, label?: string, immediate = false) => {
      setCoordinate(next);
      setPicked(true);
      animateTo(next, immediate);

      if (label !== undefined) {
        if (reverseTimer.current) {
          clearTimeout(reverseTimer.current);
        }
        setPlaceName(label);
        return;
      }

      if (reverseTimer.current) {
        clearTimeout(reverseTimer.current);
      }
      reverseTimer.current = setTimeout(() => {
        void reverseGeocode(next.latitude, next.longitude, locale).then((name) => {
          setPlaceName(name);
        });
      }, 350);
    },
    [animateTo, locale],
  );

  const onSelectPlace = useCallback(
    (place: NominatimPlace) => {
      // The suggestion overlay sits on the map: the same tap would otherwise
      // drop a pin wherever the finger hit the canvas (looks "random").
      ignoreMapPressUntil.current = Date.now() + 800;
      Keyboard.dismiss();
      const next: MapCoordinate = {
        latitude: place.lat,
        longitude: place.lon,
      };
      if (!isValidCoordinate(next.latitude, next.longitude)) {
        return;
      }
      applyCoordinate(next, place.label, true);
    },
    [applyCoordinate],
  );

  const onMapPress = useCallback(
    (next: MapCoordinate) => {
      if (Date.now() < ignoreMapPressUntil.current) {
        return;
      }
      Keyboard.dismiss();
      applyCoordinate(next);
    },
    [applyCoordinate],
  );

  const centerOnUser = useCallback(async (pick: boolean, silent = false) => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (!silent) {
          Alert.alert(t("permissions.denied.title"), t("screens.mapPicker.locationDenied"));
        }
        return;
      }
      const next = await readUserCoordinate();
      if (!next) {
        if (!silent) {
          Alert.alert(t("permissions.denied.title"), t("screens.mapPicker.locationDenied"));
        }
        return;
      }
      setUserCoordinate(next);
      if (pick) {
        applyCoordinate(next);
      } else {
        setCoordinate(next);
        animateTo(next);
      }
    } catch {
      if (!silent) {
        Alert.alert(t("permissions.denied.title"), t("screens.mapPicker.locationDenied"));
      }
    } finally {
      setLocating(false);
    }
  }, [animateTo, applyCoordinate, t]);

  const didAutoCenter = useRef(false);
  useEffect(() => {
    if (initialCoordinate || didAutoCenter.current) {
      return;
    }
    didAutoCenter.current = true;
    void centerOnUser(false, true);
  }, [centerOnUser, initialCoordinate]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted" || cancelled) {
          return;
        }
        const last = toMapCoordinate((await Location.getLastKnownPositionAsync())?.coords);
        if (last && !cancelled) {
          setUserCoordinate((current) => current ?? last);
        }
      } catch {
        // Search still works without a viewbox.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const confirm = useCallback(() => {
    if (!picked) {
      return;
    }
    setMapPickerResult({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      placeName,
    });
    router.back();
  }, [coordinate, picked, placeName, router]);

  return (
    <View className="flex-1 bg-canvas">
      <Stack.Screen options={{ title: t("screens.mapPicker.title") }} />

      {Platform.OS === "web" ? (
        <View className="flex-1 bg-map" />
      ) : (
        <OsmMap
          cameraRef={cameraRef}
          center={coordinate}
          zoom={zoom}
          onPress={onMapPress}
          onMapReady={onMapReady}
          showsUserLocation
          className="flex-1"
        >
          {picked ? (
            <>
              <GeofenceLayer
                latitude={coordinate.latitude}
                longitude={coordinate.longitude}
                radius={radius}
                color={color}
              />
              <Marker
                id="picker-pin"
                lngLat={[coordinate.longitude, coordinate.latitude]}
                anchor="center"
              >
                <AlarmMapMarker color={color} icon={icon} size={32} />
              </Marker>
            </>
          ) : null}
        </OsmMap>
      )}

      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0 top-0 px-space-4 pt-space-4"
      >
        <LocationSearchBar onSelectPlace={onSelectPlace} proximity={userCoordinate} />
        <Text className="typo-caption mt-space-2 rounded-control bg-card px-space-3 py-space-1">
          {t("screens.mapPicker.hint")}
        </Text>
      </View>

      <View
        pointerEvents="box-none"
        className="absolute right-space-4"
        style={{ bottom: Math.max(insets.bottom, 16) + 88 }}
      >
        <View className="rounded-pill bg-card shadow-map">
          {locating ? (
            <View className="h-touch w-touch items-center justify-center">
              <ActivityIndicator color={palette.primary} />
            </View>
          ) : (
            <IconButton
              icon="locate"
              accessibilityLabel={t("a11y.centerOnMe")}
              onPress={() => {
                void centerOnUser(true);
              }}
            />
          )}
        </View>
      </View>

      <View
        className="absolute left-0 right-0 bg-card px-space-4 pt-space-3"
        style={{
          bottom: 0,
          paddingBottom: Math.max(insets.bottom, 16),
        }}
      >
        {placeName ? (
          <Text className="typo-caption mb-space-2" numberOfLines={2}>
            {placeName}
          </Text>
        ) : locating ? (
          <Text className="typo-caption mb-space-2">{t("screens.mapPicker.locating")}</Text>
        ) : null}
        <Button disabled={!picked} onPress={confirm}>
          {t("screens.mapPicker.confirm")}
        </Button>
        <Text className="typo-caption mt-space-2 text-center">{OSM_ATTRIBUTION}</Text>
      </View>
    </View>
  );
}
