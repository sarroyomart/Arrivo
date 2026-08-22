import { Platform } from "react-native";

import SystemSoundsModule from "./src/SystemSoundsModule";
import type { SystemSoundItem, SystemSoundKind } from "./src/SystemSounds.types";

export type { SystemSoundItem, SystemSoundKind };

export type NativeAlarmNotificationParams = {
  identifier: string;
  title: string;
  body: string;
  alarmId: string;
  channelId: string;
  launchUrl: string;
  silent?: boolean;
};

export function canUseAndroidSystemSounds(): boolean {
  return Platform.OS === "android";
}

export async function listSystemSoundPicks(limit = 10): Promise<SystemSoundItem[]> {
  if (Platform.OS !== "android") {
    return [];
  }
  return SystemSoundsModule.listPicks(limit);
}

export async function playSystemSound(uri: string, loop = false): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }
  await SystemSoundsModule.play(uri, loop);
}

export async function playRawResource(name: string, loop = false): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }
  await SystemSoundsModule.playResource(name, loop);
}

export async function stopSystemSound(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }
  await SystemSoundsModule.stop();
}

export async function presentNativeAlarmNotification(
  params: NativeAlarmNotificationParams,
): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }
  await SystemSoundsModule.presentAlarmNotification(
    params.identifier,
    params.title,
    params.body,
    params.alarmId,
    params.channelId,
    params.launchUrl,
    Boolean(params.silent),
  );
}

export async function dismissNativeAlarmNotification(identifier: string): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }
  await SystemSoundsModule.dismissAlarmNotification(identifier);
}

export async function acquireAlarmWakeLock(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }
  await SystemSoundsModule.acquireWakeLock();
}

export async function releaseAlarmWakeLock(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }
  await SystemSoundsModule.releaseWakeLock();
}

export async function canUseFullScreenIntent(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return false;
  }
  return SystemSoundsModule.canUseFullScreenIntent();
}

export async function openFullScreenIntentSettings(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }
  await SystemSoundsModule.openFullScreenIntentSettings();
}
