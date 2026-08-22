import { prepareAlarmAudioMode, startAlarmAudio } from "@/src/services/alarmAudio";
import {
  announceRingingAlarm,
  scheduleAlarmNotification,
} from "@/src/services/notifications";
import { getAlarmById, setRingingAlarmId } from "@/src/services/storage";
import type { GeoAlarm } from "@/src/types/alarm";

const FIRE_COOLDOWN_MS = 60_000;
const recentlyFired = new Map<string, number>();

export function claimAlarmFire(alarmId: string): boolean {
  const last = recentlyFired.get(alarmId);
  const now = Date.now();
  if (last != null && now - last < FIRE_COOLDOWN_MS) {
    return false;
  }
  recentlyFired.set(alarmId, now);
  return true;
}

export async function triggerGeoAlarm(
  alarm: GeoAlarm,
  options?: { notificationAlreadyShown?: boolean },
): Promise<void> {
  if (!alarm.isActive) {
    return;
  }
  if (!claimAlarmFire(alarm.id)) {
    return;
  }

  await setRingingAlarmId(alarm.id);
  announceRingingAlarm(alarm.id);

  try {
    await prepareAlarmAudioMode();
    await startAlarmAudio(alarm.soundConfig);
  } catch (error) {
    console.warn("[Arrivo] Failed to start alarm audio", error);
  }

  if (!options?.notificationAlreadyShown) {
    await scheduleAlarmNotification(alarm);
  }
}

export async function triggerGeoAlarmById(
  alarmId: string,
  options?: { notificationAlreadyShown?: boolean },
): Promise<void> {
  const alarm = await getAlarmById(alarmId);
  if (!alarm) {
    await setRingingAlarmId(alarmId);
    announceRingingAlarm(alarmId);
    return;
  }
  await triggerGeoAlarm(alarm, options);
}
