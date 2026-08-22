import { Ionicons } from "@expo/vector-icons";
import { Marker, type CameraRef } from "@maplibre/maplibre-react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AlarmIcon } from "@/src/components/AlarmIcon";
import { AlarmMapMarker } from "@/src/components/AlarmMapMarker";
import { Button } from "@/src/components/Button";
import { GeofenceLayer } from "@/src/components/GeofenceLayer";
import { OsmMap } from "@/src/components/OsmMap";
import {
  DEFAULT_COORDINATE,
  OSM_ATTRIBUTION,
  zoomForRadius,
  type MapCoordinate,
} from "@/src/constants";
import { usePalette } from "@/src/hooks/usePalette";
import { useTranslation } from "@/src/i18n";
import type { GeoAlarm } from "@/src/types/alarm";
import { formatDistanceMeters, haversineMeters } from "@/src/utils/geo";

const LOCATION_WATCH = {
  accuracy: Location.Accuracy.Balanced,
  distanceInterval: 8,
  timeInterval: 2_000,
} as const;

type ActiveAlarmsMapProps = {
  alarms: GeoAlarm[];
};

function toCoordinate(
  coords: { latitude: number; longitude: number } | undefined,
): MapCoordinate | null {
  if (
    !coords ||
    !Number.isFinite(coords.latitude) ||
    !Number.isFinite(coords.longitude)
  ) {
    return null;
  }
  return { latitude: coords.latitude, longitude: coords.longitude };
}

function boundsOf(points: MapCoordinate[]): [number, number, number, number] {
  const lngs = points.map((point) => point.longitude);
  const lats = points.map((point) => point.latitude);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const padLng = Math.max((east - west) * 0.18, 0.004);
  const padLat = Math.max((north - south) * 0.18, 0.004);
  return [west - padLng, south - padLat, east + padLng, north + padLat];
}

export function ActiveAlarmsMap({ alarms }: ActiveAlarmsMapProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraRef>(null);
  const mapReadyRef = useRef(false);
  const pendingFitRef = useRef<MapCoordinate | null | "alarms">(null);
  const skipMapPressRef = useRef(false);

  const activeAlarms = useMemo(
    () => alarms.filter((alarm) => alarm.isActive),
    [alarms],
  );

  const [userCoord, setUserCoord] = useState<MapCoordinate | null>(null);
  const [selectedAlarm, setSelectedAlarm] = useState<GeoAlarm | null>(null);
  const [locating, setLocating] = useState(true);
  const didCenterRef = useRef(false);
  const activeAlarmsRef = useRef(activeAlarms);
  activeAlarmsRef.current = activeAlarms;

  const selected = useMemo(() => {
    if (!selectedAlarm) {
      return null;
    }
    return activeAlarms.find((alarm) => alarm.id === selectedAlarm.id) ?? null;
  }, [activeAlarms, selectedAlarm]);

  useEffect(() => {
    if (selectedAlarm && !selected) {
      setSelectedAlarm(null);
    }
  }, [selected, selectedAlarm]);

  const centerOnUser = useCallback((coord: MapCoordinate, duration = 350) => {
    cameraRef.current?.easeTo({
      center: [coord.longitude, coord.latitude],
      zoom: 14,
      duration,
    });
  }, []);

  const fitToAlarms = useCallback((origin: MapCoordinate | null) => {
    if (!mapReadyRef.current) {
      pendingFitRef.current = origin ?? "alarms";
      return;
    }

    const points: MapCoordinate[] = [
      ...(origin ? [origin] : []),
      ...activeAlarmsRef.current.map((alarm) => ({
        latitude: alarm.latitude,
        longitude: alarm.longitude,
      })),
    ];
    if (points.length === 0) {
      return;
    }
    if (points.length === 1) {
      cameraRef.current?.easeTo({
        center: [points[0].longitude, points[0].latitude],
        zoom: zoomForRadius(400),
        duration: 0,
      });
      return;
    }
    cameraRef.current?.fitBounds(boundsOf(points), {
      padding: { top: 72, right: 48, bottom: 120, left: 48 },
      duration: 0,
    });
  }, []);

  const onMapReady = useCallback(() => {
    mapReadyRef.current = true;
    const pending = pendingFitRef.current;
    pendingFitRef.current = null;
    if (pending === "alarms") {
      fitToAlarms(null);
      return;
    }
    if (pending) {
      fitToAlarms(pending);
    }
  }, [fitToAlarms]);

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    const start = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || cancelled) {
          setLocating(false);
          if (!didCenterRef.current && activeAlarmsRef.current.length > 0) {
            didCenterRef.current = true;
            fitToAlarms(null);
          }
          return;
        }

        const last = toCoordinate(
          (await Location.getLastKnownPositionAsync())?.coords,
        );
        if (last && !cancelled) {
          setUserCoord(last);
          if (!didCenterRef.current) {
            didCenterRef.current = true;
            fitToAlarms(last);
          }
        }

        subscription = await Location.watchPositionAsync(
          LOCATION_WATCH,
          (position) => {
            const next = toCoordinate(position.coords);
            if (!next || cancelled) {
              return;
            }
            setUserCoord(next);
            if (!didCenterRef.current) {
              didCenterRef.current = true;
              fitToAlarms(next);
            }
          },
        );
      } catch {
        if (!didCenterRef.current && activeAlarmsRef.current.length > 0) {
          didCenterRef.current = true;
          fitToAlarms(null);
        }
      } finally {
        if (!cancelled) {
          setLocating(false);
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [fitToAlarms]);

  const handleRecenter = useCallback(() => {
    if (userCoord) {
      centerOnUser(userCoord);
      return;
    }
    setLocating(true);
    void (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          return;
        }
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const next = toCoordinate(position.coords);
        if (next) {
          setUserCoord(next);
          centerOnUser(next);
        }
      } finally {
        setLocating(false);
      }
    })();
  }, [centerOnUser, userCoord]);

  const onMapPress = useCallback(() => {
    if (skipMapPressRef.current) {
      skipMapPressRef.current = false;
      return;
    }
    setSelectedAlarm(null);
  }, []);

  const selectAlarm = useCallback((alarm: GeoAlarm) => {
    skipMapPressRef.current = true;
    setSelectedAlarm(alarm);
  }, []);

  const distanceLabel = useMemo(() => {
    if (!selected) {
      return null;
    }
    if (!userCoord) {
      return t("map.unknown_distance");
    }
    const meters = haversineMeters(userCoord, {
      latitude: selected.latitude,
      longitude: selected.longitude,
    });
    return t("map.distance", {
      distance: formatDistanceMeters(meters, locale),
    });
  }, [locale, selected, t, userCoord]);

  const sheetOffset = Math.max(insets.bottom, 16);
  const locateBottom = selected ? sheetOffset + 118 : sheetOffset + 16;

  if (Platform.OS === "web") {
    return (
      <View className="flex-1 items-center justify-center bg-map px-space-6">
        <Text className="typo-caption text-center">{t("map.no_active_alarms")}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-map">
      <OsmMap
        cameraRef={cameraRef}
        center={userCoord ?? DEFAULT_COORDINATE}
        zoom={14}
        onPress={onMapPress}
        onMapReady={onMapReady}
        showsUserLocation
        className="flex-1"
      >
        {activeAlarms.map((alarm) => (
          <GeofenceLayer
            key={`${alarm.id}-circle`}
            id={`active-${alarm.id}`}
            latitude={alarm.latitude}
            longitude={alarm.longitude}
            radius={alarm.radius}
            color={alarm.color}
          />
        ))}
        {activeAlarms.map((alarm) => (
          <Marker
            key={alarm.id}
            id={`alarm-${alarm.id}`}
            lngLat={[alarm.longitude, alarm.latitude]}
            anchor="center"
            onPress={() => selectAlarm(alarm)}
          >
            <AlarmMapMarker color={alarm.color} icon={alarm.icon} size={32} />
          </Marker>
        ))}
      </OsmMap>

      {activeAlarms.length === 0 ? (
        <View
          pointerEvents="none"
          className="absolute left-space-4 right-space-4 top-space-4 rounded-card bg-card px-space-4 py-space-3 shadow-map"
        >
          <Text className="typo-caption text-center">{t("map.no_active_alarms")}</Text>
        </View>
      ) : null}

      <View
        pointerEvents="box-none"
        className="absolute right-space-4"
        style={{ bottom: locateBottom }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("map.center_me")}
          onPress={handleRecenter}
          className="h-touch w-touch items-center justify-center rounded-pill border border-border bg-card shadow-map active:bg-canvas"
        >
          {locating ? (
            <ActivityIndicator color={palette.primary} />
          ) : (
            <Ionicons name="locate" size={22} color={palette.primary} />
          )}
        </Pressable>
      </View>

      {selected ? (
        <View
          className="absolute left-space-4 right-space-4 rounded-card border border-border bg-card p-space-4 shadow-map"
          style={{ bottom: sheetOffset }}
        >
          <View className="mb-space-3 h-1 w-10 self-center rounded-pill bg-border" />
          <View className="flex-row items-center gap-space-3">
            <AlarmIcon icon={selected.icon} color={selected.color} size="sm" />
            <View className="min-w-0 flex-1">
              <Text className="typo-h2" numberOfLines={1}>
                {selected.title}
              </Text>
              {distanceLabel ? (
                <Text className="typo-caption mt-space-1">{distanceLabel}</Text>
              ) : null}
            </View>
            <Button
              size="sm"
              onPress={() => router.push(`/alarm/${selected.id}`)}
            >
              {t("map.edit")}
            </Button>
          </View>
        </View>
      ) : null}

      <Text
        pointerEvents="none"
        className="typo-caption absolute left-space-2"
        style={{ bottom: selected ? sheetOffset + 108 : 8 }}
      >
        {OSM_ATTRIBUTION}
      </Text>
    </View>
  );
}
