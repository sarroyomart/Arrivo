import { AppState, Platform, type AppStateStatus } from "react-native";

import {
  addGeofenceTriggerListener,
  armBackgroundTracking,
  drainPendingRingingAlarmId,
  pauseBackgroundTracking,
  startBackgroundTracking,
  stopBackgroundTracking,
  type NativeTrackedAlarm,
  type OngoingTrackingCopy,
} from "@/modules/location-foreground";
import { androidChannelIdFor } from "@/src/constants";
import { currentLocale, en, es, t } from "@/src/i18n";
import { ringingLaunchUrl } from "@/src/services/notifications";
import {
  startProximityMonitor,
  stopProximityMonitor,
} from "@/src/services/proximityMonitor";
import { getAlarms, setRingingAlarmId } from "@/src/services/storage";
import { triggerGeoAlarmById } from "@/src/services/triggerAlarm";
import {
  alarmTriggerOf,
  isSilentSoundConfig,
  type GeoAlarm,
} from "@/src/types/alarm";

let appStateSubscription: { remove: () => void } | null = null;
let nativeTriggerSubscription: { remove: () => void } | null = null;
let reconciling: Promise<void> | null = null;
let pendingReconcile = false;
let lastAppState: AppStateStatus = AppState.currentState;
let cachedActiveAlarms: GeoAlarm[] = [];
let cachedNativeAlarms: NativeTrackedAlarm[] = [];

function toNativeAlarms(alarms: GeoAlarm[]): NativeTrackedAlarm[] {
  return alarms.map((alarm) => {
    const isExit = alarmTriggerOf(alarm.trigger) === "exit";
    return {
      id: alarm.id,
      title: alarm.title,
      latitude: alarm.latitude,
      longitude: alarm.longitude,
      radius: alarm.radius,
      trigger: alarmTriggerOf(alarm.trigger),
      channelId: androidChannelIdFor(alarm.soundConfig),
      silent: isSilentSoundConfig(alarm.soundConfig),
      launchUrl: ringingLaunchUrl(alarm.id),
      alarmTitle: isExit
        ? t("alarmNotification.exitTitle")
        : t("alarmNotification.title"),
      alarmBody: isExit
        ? t("alarmNotification.exitBody", { title: alarm.title })
        : t("alarmNotification.body", { title: alarm.title }),
    };
  });
}

function ongoingCopy(): OngoingTrackingCopy {
  const locale = currentLocale();
  const copy = locale === "es" ? es.foregroundService : en.foregroundService;
  return {
    title: copy.title,
    body: copy.body,
    near: copy.near,
    inside: copy.inside,
    more: copy.more,
    locale,
  };
}

function cacheNativeAlarms(alarms: GeoAlarm[]): NativeTrackedAlarm[] {
  cachedActiveAlarms = alarms.filter((alarm) => alarm.isActive);
  cachedNativeAlarms = toNativeAlarms(cachedActiveAlarms);
  return cachedNativeAlarms;
}

/**
 * Persist the current active alarms so native onPause can start the FGS
 * without waiting for JS or AsyncStorage.
 */
export function primeLocationForeground(alarms: GeoAlarm[]): void {
  if (Platform.OS !== "android") {
    return;
  }
  const nativeAlarms = cacheNativeAlarms(alarms);
  if (nativeAlarms.length === 0) {
    void stopBackgroundTracking().catch((error) => {
      console.warn("[Arrivo] Failed to disarm location tracking", error);
    });
    return;
  }
  void armBackgroundTracking(nativeAlarms, ongoingCopy()).catch((error) => {
    console.warn("[Arrivo] Failed to arm location tracking", error);
  });
}

function startTrackingFromCache(): void {
  if (cachedNativeAlarms.length === 0) {
    return;
  }
  void startBackgroundTracking(cachedNativeAlarms, ongoingCopy()).catch((error) => {
    console.warn("[Arrivo] Failed to start location service on background", error);
  });
}

function onAppStateChange(nextState: AppStateStatus): void {
  lastAppState = nextState;
  if (nextState === "active") {
    if (cachedActiveAlarms.length > 0) {
      void startProximityMonitor(cachedActiveAlarms);
    }
    void reconcileLocationForeground();
    return;
  }
  // Do not wait for storage or reconcile: JS may freeze once backgrounded,
  // and startForegroundService is often blocked after the activity has stopped.
  startTrackingFromCache();
  stopProximityMonitor();
  void reconcileLocationForeground();
}

export async function reconcileLocationForeground(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }
  if (reconciling) {
    pendingReconcile = true;
    return reconciling;
  }

  reconciling = (async () => {
    try {
      const active = (await getAlarms()).filter((alarm) => alarm.isActive);
      const nativeAlarms = cacheNativeAlarms(active);
      const copy = ongoingCopy();

      if (nativeAlarms.length === 0) {
        stopProximityMonitor();
        await stopBackgroundTracking();
        return;
      }

      // Always arm first so native onPause has payload even if we stay in the UI.
      await armBackgroundTracking(nativeAlarms, copy);

      if (lastAppState === "active") {
        await startProximityMonitor(active);
        if (lastAppState === "active") {
          await pauseBackgroundTracking();
        }
        return;
      }

      stopProximityMonitor();
      await startBackgroundTracking(nativeAlarms, copy);
    } catch (error) {
      console.warn("[Arrivo] Failed to reconcile location foreground service", error);
    }
  })().finally(() => {
    reconciling = null;
    if (pendingReconcile) {
      pendingReconcile = false;
      void reconcileLocationForeground();
    }
  });

  return reconciling;
}

async function handleNativeTrigger(alarmId: string): Promise<void> {
  await setRingingAlarmId(alarmId);
  await triggerGeoAlarmById(alarmId, { notificationAlreadyShown: true });
}

export function ensureLocationForegroundLifecycle(): () => void {
  if (Platform.OS !== "android") {
    return () => {};
  }

  if (!nativeTriggerSubscription) {
    nativeTriggerSubscription = addGeofenceTriggerListener((event) => {
      if (event?.id) {
        void handleNativeTrigger(event.id);
      }
    });
  }

  if (!appStateSubscription) {
    lastAppState = AppState.currentState;
    appStateSubscription = AppState.addEventListener("change", (nextState) => {
      onAppStateChange(nextState);
    });
  }

  void (async () => {
    try {
      const pending = await drainPendingRingingAlarmId();
      if (pending) {
        await handleNativeTrigger(pending);
      }
    } catch (error) {
      console.warn("[Arrivo] Failed to drain pending ringing alarm", error);
    }
    await reconcileLocationForeground();
  })();

  return () => {
    appStateSubscription?.remove();
    appStateSubscription = null;
    nativeTriggerSubscription?.remove();
    nativeTriggerSubscription = null;
    stopProximityMonitor();
    void stopBackgroundTracking();
  };
}
