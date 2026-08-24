import * as Location from "expo-location";
import { Platform } from "react-native";

import { triggerGeoAlarm } from "@/src/services/triggerAlarm";
import { alarmTriggerOf, type GeoAlarm } from "@/src/types/alarm";
import { haversineMeters } from "@/src/utils/geo";

const LOCATION_WATCH = {
  accuracy: Location.Accuracy.High,
  distanceInterval: 8,
  timeInterval: 2_000,
} as const;

let subscription: Location.LocationSubscription | null = null;
let starting: Promise<void> | null = null;
let alarms: GeoAlarm[] = [];
let watchGeneration = 0;
const insideIds = new Set<string>();
const seeded = { value: false };

function retainKnownIds(nextAlarms: GeoAlarm[]): void {
  const ids = new Set(nextAlarms.map((alarm) => alarm.id));
  for (const id of [...insideIds]) {
    if (!ids.has(id)) {
      insideIds.delete(id);
    }
  }
}

function onCoords(latitude: number, longitude: number): void {
  if (alarms.length === 0) {
    return;
  }

  const nextInside = new Set<string>();

  for (const alarm of alarms) {
    const meters = haversineMeters(
      { latitude, longitude },
      { latitude: alarm.latitude, longitude: alarm.longitude },
    );
    const inside = meters <= alarm.radius;
    if (inside) {
      nextInside.add(alarm.id);
    }

    if (!seeded.value) {
      continue;
    }

    const wasInside = insideIds.has(alarm.id);
    const trigger = alarmTriggerOf(alarm.trigger);
    const shouldFire =
      trigger === "exit" ? wasInside && !inside : !wasInside && inside;
    if (shouldFire) {
      void triggerGeoAlarm(alarm);
    }
  }

  insideIds.clear();
  for (const id of nextInside) {
    insideIds.add(id);
  }
  seeded.value = true;
}

function setProximityAlarms(nextAlarms: GeoAlarm[]): void {
  alarms = nextAlarms.filter((alarm) => alarm.isActive);
  retainKnownIds(alarms);
  if (alarms.length === 0) {
    stopProximityMonitor();
  }
}

export async function startProximityMonitor(nextAlarms: GeoAlarm[]): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  setProximityAlarms(nextAlarms);
  if (alarms.length === 0) {
    stopProximityMonitor();
    return;
  }
  if (subscription || starting) {
    return starting ?? Promise.resolve();
  }

  starting = (async () => {
    const generation = watchGeneration;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (generation !== watchGeneration || status !== "granted" || alarms.length === 0) {
        return;
      }

      const last = await Location.getLastKnownPositionAsync();
      if (generation !== watchGeneration) {
        return;
      }
      if (last?.coords) {
        onCoords(last.coords.latitude, last.coords.longitude);
      }

      const next = await Location.watchPositionAsync(LOCATION_WATCH, (position) => {
        onCoords(position.coords.latitude, position.coords.longitude);
      });
      if (generation !== watchGeneration) {
        next.remove();
        return;
      }
      subscription = next;
    } catch (error) {
      console.warn("[Arrivo] Failed to start foreground proximity watch", error);
    } finally {
      if (generation === watchGeneration) {
        starting = null;
      }
    }
  })();

  return starting;
}

export function stopProximityMonitor(): void {
  watchGeneration += 1;
  subscription?.remove();
  subscription = null;
  starting = null;
  insideIds.clear();
  seeded.value = false;
}
