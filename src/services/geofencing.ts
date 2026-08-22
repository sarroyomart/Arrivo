import { Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { GEOFENCE_TASK_NAME, MAX_ACTIVE_GEOFENCES } from "@/src/constants";
import { reconcileLocationForeground } from "@/src/services/locationForeground";
import { getAlarms } from "@/src/services/storage";
import { alarmTriggerOf, type GeoAlarm } from "@/src/types/alarm";

function toLocationRegion(alarm: GeoAlarm): Location.LocationRegion {
  const trigger = alarmTriggerOf(alarm.trigger);
  return {
    identifier: alarm.id,
    latitude: alarm.latitude,
    longitude: alarm.longitude,
    radius: alarm.radius,
    notifyOnEnter: trigger === "enter",
    notifyOnExit: trigger === "exit",
  };
}

export async function syncActiveRegions(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  if (Platform.OS === "android") {
    try {
      await reconcileLocationForeground();
    } catch (error) {
      console.warn("[Arrivo] Failed to sync geofence regions", error);
    }
    return;
  }

  try {
    const available = await TaskManager.isAvailableAsync();
    if (!available) {
      return;
    }

    const alarms = await getAlarms();
    const active = alarms.filter((alarm) => alarm.isActive);

    if (active.length > MAX_ACTIVE_GEOFENCES) {
      console.warn(
        `[Arrivo] Active geofences capped at ${MAX_ACTIVE_GEOFENCES}; ${active.length} were active.`,
      );
    }

    const limited = active.slice(0, MAX_ACTIVE_GEOFENCES);
    const started = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);

    if (limited.length === 0) {
      if (started) {
        await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
      }
      return;
    }

    await Location.startGeofencingAsync(
      GEOFENCE_TASK_NAME,
      limited.map(toLocationRegion),
    );
  } catch (error) {
    console.warn("[Arrivo] Failed to sync geofence regions", error);
  }
}
