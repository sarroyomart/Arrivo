import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import {
  acquireAlarmWakeLock,
  dismissNativeAlarmNotification,
  presentNativeAlarmNotification,
} from "@/modules/system-sounds";
import {
  ALARM_NOTIFICATION_CATEGORY,
  ANDROID_ALARM_CHANNEL_ID,
  ANDROID_ALARM_CHANNEL_IDS,
  ANDROID_ALARM_SOUND,
  ALARM_SOUND_FILES,
  LEGACY_ANDROID_ALARM_CHANNEL_IDS,
  RINGING_NOTIFICATION_ACTION,
  RINGING_PATH,
  androidChannelIdFor,
} from "@/src/constants";
import { FALLBACK_PRIMARY } from "@/src/constants/palette";
import { t } from "@/src/i18n";
import {
  alarmSystemToneOf,
  alarmTriggerOf,
  isSilentSoundConfig,
  type AlarmSoundConfig,
  type AlarmSystemTone,
  type GeoAlarm,
} from "@/src/types/alarm";

export type AlarmNotificationData = {
  alarmId: string;
  action: typeof RINGING_NOTIFICATION_ACTION;
  fullScreenIntent?: boolean;
};

type NotificationResponseListener = (alarmId: string) => void;

const responseListeners = new Set<NotificationResponseListener>();
let pendingRingingAlarmId: string | null = null;
let responseSubscription: Notifications.EventSubscription | null = null;
let receivedSubscription: Notifications.EventSubscription | null = null;
let linkingSubscription: { remove: () => void } | null = null;
let handlerConfigured = false;
let lastConsumedNotificationResponseId: string | null = null;

const ALARM_VIBRATION_PATTERN = [0, 500, 200, 500];

function isAlarmNotificationData(value: unknown): value is AlarmNotificationData {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const data = value as Record<string, unknown>;
  return (
    data.action === RINGING_NOTIFICATION_ACTION && typeof data.alarmId === "string"
  );
}

export function getRingingAlarmIdFromNotificationData(data: unknown): string | null {
  return isAlarmNotificationData(data) ? data.alarmId : null;
}

export function ringingLaunchUrl(alarmId: string): string {
  return Linking.createURL(RINGING_PATH, {
    queryParams: { id: alarmId },
  });
}

export function getAlarmIdFromLinkingUrl(url: string | null): string | null {
  if (!url || !url.includes("ringing")) {
    return null;
  }
  const parsed = Linking.parse(url);
  const raw = parsed.queryParams?.id;
  if (typeof raw === "string" && raw.length > 0) {
    return raw;
  }
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0].length > 0) {
    return raw[0];
  }
  return null;
}

function rememberRingingAlarmId(alarmId: string): void {
  pendingRingingAlarmId = alarmId;
  for (const listener of responseListeners) {
    listener(alarmId);
  }
}

/** Lets native/JS geofence paths open `/ringing` through the existing layout subscriber. */
export function announceRingingAlarm(alarmId: string): void {
  rememberRingingAlarmId(alarmId);
}

function handleNotificationData(data: unknown): void {
  const alarmId = getRingingAlarmIdFromNotificationData(data);
  if (alarmId) {
    rememberRingingAlarmId(alarmId);
  }
}

function hydrateFromLastNotificationResponse(): void {
  try {
    const last = Notifications.getLastNotificationResponse();
    if (!last) {
      return;
    }
    const responseId = last.notification.request.identifier;
    if (responseId && responseId === lastConsumedNotificationResponseId) {
      return;
    }
    lastConsumedNotificationResponseId = responseId ?? null;
    handleNotificationData(last.notification.request.content.data);
  } catch {
    // Native module may not be ready yet during the first import.
  }
}

function ensureNotificationHandler(): void {
  if (handlerConfigured) {
    return;
  }
  handlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const isAlarm = Boolean(
        getRingingAlarmIdFromNotificationData(notification.request.content.data),
      );
      return {
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        priority: isAlarm
          ? Notifications.AndroidNotificationPriority.MAX
          : Notifications.AndroidNotificationPriority.HIGH,
      };
    },
  });
}

function ensureResponseSubscription(): void {
  if (responseSubscription) {
    return;
  }

  responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      handleNotificationData(response.notification.request.content.data);
    },
  );
  hydrateFromLastNotificationResponse();
}

function ensureReceivedSubscription(): void {
  if (receivedSubscription) {
    return;
  }

  receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    handleNotificationData(notification.request.content.data);
  });
}

function ensureLinkingSubscription(): void {
  if (linkingSubscription) {
    return;
  }

  linkingSubscription = Linking.addEventListener("url", ({ url }) => {
    const alarmId = getAlarmIdFromLinkingUrl(url);
    if (alarmId) {
      rememberRingingAlarmId(alarmId);
    }
  });

  void Linking.getInitialURL()
    .then((url) => {
      const alarmId = getAlarmIdFromLinkingUrl(url);
      if (alarmId) {
        rememberRingingAlarmId(alarmId);
      }
    })
    .catch(() => {
      // Linking is unavailable on some platforms during tests.
    });
}

function bundledSoundFile(tone: AlarmSystemTone): string {
  return ALARM_SOUND_FILES[tone];
}

async function registerAlarmCategory(): Promise<void> {
  try {
    await Notifications.setNotificationCategoryAsync(ALARM_NOTIFICATION_CATEGORY, [], {
      showTitle: true,
      showSubtitle: true,
    });
  } catch (error) {
    console.warn("[Arrivo] Failed to register alarm notification category", error);
  }
}

async function deleteLegacyAndroidChannels(): Promise<void> {
  await Promise.all(
    LEGACY_ANDROID_ALARM_CHANNEL_IDS.map(async (channelId) => {
      try {
        await Notifications.deleteNotificationChannelAsync(channelId);
      } catch {
        // Channel may not exist on a fresh install.
      }
    }),
  );
}

export async function ensureAlarmNotificationChannel(): Promise<void> {
  ensureNotificationHandler();
  ensureResponseSubscription();
  ensureReceivedSubscription();
  ensureLinkingSubscription();
  await registerAlarmCategory();

  if (Platform.OS !== "android") {
    return;
  }

  await deleteLegacyAndroidChannels();

  const channelConfigs: {
    id: string;
    silent: boolean;
    tone?: AlarmSystemTone;
  }[] = [
    { id: ANDROID_ALARM_CHANNEL_ID, silent: false, tone: "default" },
    { id: ANDROID_ALARM_CHANNEL_IDS.default, silent: false, tone: "default" },
    { id: ANDROID_ALARM_CHANNEL_IDS.gentle, silent: false, tone: "gentle" },
    { id: ANDROID_ALARM_CHANNEL_IDS.urgent, silent: false, tone: "urgent" },
    { id: ANDROID_ALARM_CHANNEL_IDS.system, silent: false, tone: "default" },
    { id: ANDROID_ALARM_CHANNEL_IDS.custom, silent: false, tone: "default" },
    { id: ANDROID_ALARM_CHANNEL_IDS.vibration, silent: true },
  ];

  await Promise.all(
    channelConfigs.map((channel) => {
      return Notifications.setNotificationChannelAsync(channel.id, {
        name: t("alarmNotification.channelName"),
        importance: Notifications.AndroidImportance.MAX,
        bypassDnd: false,
        description: t("alarmNotification.title"),
        enableLights: true,
        enableVibrate: true,
        lightColor: FALLBACK_PRIMARY,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
        sound: channel.silent ? null : bundledSoundFile(channel.tone ?? "default"),
        vibrationPattern: ALARM_VIBRATION_PATTERN,
        audioAttributes: channel.silent
          ? undefined
          : {
              usage: Notifications.AndroidAudioUsage.ALARM,
              contentType: Notifications.AndroidAudioContentType.SONIFICATION,
            },
      });
    }),
  );
}

export function consumePendingRingingAlarmId(): string | null {
  hydrateFromLastNotificationResponse();
  const alarmId = pendingRingingAlarmId;
  pendingRingingAlarmId = null;
  return alarmId;
}

export function subscribeToAlarmNotificationResponses(
  listener: NotificationResponseListener,
): () => void {
  ensureNotificationHandler();
  ensureResponseSubscription();
  ensureReceivedSubscription();
  ensureLinkingSubscription();
  responseListeners.add(listener);
  return () => {
    responseListeners.delete(listener);
  };
}

export function openRingingScreen(alarmId: string): void {
  router.replace({ pathname: "/ringing", params: { id: alarmId } });
}

function notificationIdentifier(alarmId: string): string {
  return `arrivo-ringing-${alarmId}`;
}

function snoozeIdentifier(alarmId: string): string {
  return `arrivo-snooze-${alarmId}`;
}

function notificationSoundFor(config: AlarmSoundConfig): string | boolean {
  if (isSilentSoundConfig(config)) {
    return false;
  }
  if (config.mode === "custom") {
    return ANDROID_ALARM_SOUND;
  }
  if (config.mode === "system" && config.systemUri) {
    return ANDROID_ALARM_SOUND;
  }
  return bundledSoundFile(alarmSystemToneOf(config.systemTone));
}

function alarmNotificationContent(alarm: GeoAlarm) {
  const silent = isSilentSoundConfig(alarm.soundConfig);
  const isExit = alarmTriggerOf(alarm.trigger) === "exit";
  return {
    title: isExit ? t("alarmNotification.exitTitle") : t("alarmNotification.title"),
    body: isExit
      ? t("alarmNotification.exitBody", { title: alarm.title })
      : t("alarmNotification.body", { title: alarm.title }),
    data: {
      alarmId: alarm.id,
      action: RINGING_NOTIFICATION_ACTION,
      fullScreenIntent: true,
    } satisfies AlarmNotificationData,
    sound: notificationSoundFor(alarm.soundConfig),
    categoryIdentifier: ALARM_NOTIFICATION_CATEGORY,
    priority: Notifications.AndroidNotificationPriority.MAX,
    sticky: true,
    autoDismiss: false,
    interruptionLevel: silent ? "active" : "timeSensitive",
    vibrate: ALARM_VIBRATION_PATTERN,
  } as const;
}

async function presentAndroidAlarmNotification(
  alarm: GeoAlarm,
  identifier: string,
): Promise<void> {
  const content = alarmNotificationContent(alarm);
  await presentNativeAlarmNotification({
    identifier,
    title: content.title,
    body: content.body,
    alarmId: alarm.id,
    channelId: androidChannelIdFor(alarm.soundConfig),
    launchUrl: ringingLaunchUrl(alarm.id),
    silent: isSilentSoundConfig(alarm.soundConfig),
  });
  await acquireAlarmWakeLock();
}

export async function scheduleAlarmNotification(alarm: GeoAlarm): Promise<void> {
  try {
    await ensureAlarmNotificationChannel();
    const identifier = notificationIdentifier(alarm.id);
    rememberRingingAlarmId(alarm.id);

    if (Platform.OS === "android") {
      try {
        await presentAndroidAlarmNotification(alarm, identifier);
        return;
      } catch (error) {
        console.warn(
          "[Arrivo] Native full-screen alarm failed; falling back to expo-notifications",
          error,
        );
      }
    }

    const content = alarmNotificationContent(alarm);
    await Notifications.scheduleNotificationAsync({
      identifier,
      content,
      trigger:
        Platform.OS === "android"
          ? { channelId: androidChannelIdFor(alarm.soundConfig) }
          : null,
    });
  } catch (error) {
    console.warn("[Arrivo] Failed to schedule alarm notification", error);
  }
}

export async function scheduleSnoozeNotification(
  alarm: GeoAlarm,
  minutes: number,
): Promise<void> {
  try {
    await ensureAlarmNotificationChannel();
    await cancelSnoozeNotification(alarm.id);

    const seconds = Math.max(1, Math.round(minutes * 60));
    const content = alarmNotificationContent(alarm);

    await Notifications.scheduleNotificationAsync({
      identifier: snoozeIdentifier(alarm.id),
      content: {
        ...content,
        title: t("alarmNotification.snoozeTitle"),
        body: t("alarmNotification.snoozeBody", { title: alarm.title }),
        sticky: false,
        autoDismiss: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
        ...(Platform.OS === "android"
          ? { channelId: androidChannelIdFor(alarm.soundConfig) }
          : {}),
      },
    });
  } catch (error) {
    console.warn("[Arrivo] Failed to schedule snooze notification", error);
  }
}

export async function cancelSnoozeNotification(alarmId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(snoozeIdentifier(alarmId));
  } catch {
    // Nothing pending for this alarm.
  }
  try {
    await Notifications.dismissNotificationAsync(snoozeIdentifier(alarmId));
  } catch {
    // Notification may already have been cleared.
  }
  try {
    await dismissNativeAlarmNotification(snoozeIdentifier(alarmId));
  } catch {
    // Native presenter may be missing until the next development build.
  }
}

export async function dismissAlarmNotification(alarmId: string): Promise<void> {
  const identifier = notificationIdentifier(alarmId);
  try {
    await Notifications.dismissNotificationAsync(identifier);
  } catch {
    // Notification may already have been cleared by the user.
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // Nothing pending for this alarm.
  }
  try {
    await dismissNativeAlarmNotification(identifier);
  } catch {
    // Native presenter may be missing until the next development build.
  }
}

ensureNotificationHandler();
ensureResponseSubscription();
ensureReceivedSubscription();
ensureLinkingSubscription();
