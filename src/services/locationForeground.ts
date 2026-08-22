import { AppState, Platform } from "react-native";

import {
  addGeofenceTriggerListener,
  drainPendingRingingAlarmId,
  startBackgroundTracking,
  stopBackgroundTracking,
  updateActiveAlarms,
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
      const appState = AppState.currentState;

      if (active.length === 0) {
        stopProximityMonitor();
        await stopBackgroundTracking();
        return;
      }

      if (appState === "active") {
        await stopBackgroundTracking();
        await startProximityMonitor(active);
        return;
      }

      stopProximityMonitor();
      await startBackgroundTracking(toNativeAlarms(active), ongoingCopy());
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

export async function syncNativeActiveAlarms(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }
  const active = (await getAlarms()).filter((alarm) => alarm.isActive);
  if (active.length === 0) {
    await stopBackgroundTracking();
    stopProximityMonitor();
    return;
  }
  if (AppState.currentState === "active") {
    await startProximityMonitor(active);
    return;
  }
  try {
    await updateActiveAlarms(toNativeAlarms(active));
  } catch (error) {
    console.warn("[Arrivo] Failed to update native active alarms", error);
    await reconcileLocationForeground();
  }
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
    appStateSubscription = AppState.addEventListener("change", () => {
      void reconcileLocationForeground();
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
