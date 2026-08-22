import { Platform } from "react-native";

import { getLocationServiceModule } from "./src/LocationServiceModule";
import type {
  GeofenceTriggeredEvent,
  NativeTrackedAlarm,
  OngoingTrackingCopy,
} from "./src/LocationService.types";

export type { GeofenceTriggeredEvent, NativeTrackedAlarm, OngoingTrackingCopy };

function native() {
  if (Platform.OS !== "android") {
    return null;
  }
  return getLocationServiceModule();
}

function copyJson(copy: OngoingTrackingCopy): string {
  return JSON.stringify({
    near: copy.near,
    inside: copy.inside,
    more: copy.more,
    locale: copy.locale,
  });
}

export async function armBackgroundTracking(
  alarms: NativeTrackedAlarm[],
  copy: OngoingTrackingCopy,
): Promise<void> {
  const module = native();
  if (!module) {
    return;
  }
  await module.armBackgroundTracking(
    JSON.stringify(alarms),
    copy.title,
    copy.body,
    copyJson(copy),
  );
}

export async function startBackgroundTracking(
  alarms: NativeTrackedAlarm[],
  copy: OngoingTrackingCopy,
): Promise<void> {
  const module = native();
  if (!module) {
    return;
  }
  await module.startBackgroundTracking(
    JSON.stringify(alarms),
    copy.title,
    copy.body,
    copyJson(copy),
  );
}

export async function pauseBackgroundTracking(): Promise<void> {
  const module = native();
  if (!module) {
    return;
  }
  await module.pauseBackgroundTracking();
}

export async function stopBackgroundTracking(): Promise<void> {
  const module = native();
  if (!module) {
    return;
  }
  await module.stopBackgroundTracking();
}

export async function drainPendingRingingAlarmId(): Promise<string | null> {
  const module = native();
  if (!module) {
    return null;
  }
  return module.drainPendingRingingAlarmId();
}

export function addGeofenceTriggerListener(
  listener: (event: GeofenceTriggeredEvent) => void,
): { remove: () => void } {
  const module = native();
  if (!module) {
    return { remove: () => {} };
  }
  return module.addListener("onGeofenceTriggered", listener);
}
