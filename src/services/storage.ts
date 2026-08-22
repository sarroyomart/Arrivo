import AsyncStorage from "@react-native-async-storage/async-storage";

import { STORAGE_KEYS } from "@/src/constants";
import {
  alarmIconOf,
  alarmSoundConfigOf,
  alarmTriggerOf,
  type GeoAlarm,
} from "@/src/types/alarm";

function parseAlarm(value: unknown): GeoAlarm | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const alarm = value as Record<string, unknown>;
  if (
    typeof alarm.id !== "string" ||
    typeof alarm.title !== "string" ||
    typeof alarm.latitude !== "number" ||
    typeof alarm.longitude !== "number" ||
    typeof alarm.radius !== "number" ||
    typeof alarm.color !== "string" ||
    typeof alarm.isActive !== "boolean" ||
    typeof alarm.createdAt !== "number" ||
    typeof alarm.updatedAt !== "number"
  ) {
    return null;
  }

  return {
    id: alarm.id,
    title: alarm.title,
    latitude: alarm.latitude,
    longitude: alarm.longitude,
    radius: alarm.radius,
    color: alarm.color,
    icon: alarmIconOf(alarm.icon),
    soundConfig: alarmSoundConfigOf(alarm.soundConfig, alarm.sound),
    trigger: alarmTriggerOf(alarm.trigger),
    isActive: alarm.isActive,
    createdAt: alarm.createdAt,
    updatedAt: alarm.updatedAt,
  };
}

function sortAlarms(alarms: GeoAlarm[]): GeoAlarm[] {
  return [...alarms].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getAlarmById(id: string): Promise<GeoAlarm | null> {
  const alarms = await getAlarms();
  return alarms.find((alarm) => alarm.id === id) ?? null;
}

export async function getAlarms(): Promise<GeoAlarm[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.alarms);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortAlarms(
      parsed
        .map((item) => parseAlarm(item))
        .filter((alarm): alarm is GeoAlarm => alarm !== null),
    );
  } catch {
    return [];
  }
}

async function writeAlarms(alarms: GeoAlarm[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.alarms, JSON.stringify(sortAlarms(alarms)));
  } catch (error) {
    console.warn("[Arrivo] Failed to persist alarms", error);
    throw error;
  }
}

export async function upsertAlarm(alarm: GeoAlarm): Promise<void> {
  const alarms = await getAlarms();
  const index = alarms.findIndex((item) => item.id === alarm.id);
  if (index === -1) {
    alarms.push(alarm);
  } else {
    alarms[index] = alarm;
  }
  await writeAlarms(alarms);
}

export async function deleteAlarm(id: string): Promise<void> {
  const alarms = await getAlarms();
  await writeAlarms(alarms.filter((alarm) => alarm.id !== id));
}

export async function toggleAlarmActive(id: string, isActive: boolean): Promise<void> {
  const alarms = await getAlarms();
  const index = alarms.findIndex((alarm) => alarm.id === id);
  if (index === -1) {
    return;
  }

  alarms[index] = {
    ...alarms[index],
    isActive,
    updatedAt: Date.now(),
  };
  await writeAlarms(alarms);
}

export async function getRingingAlarmId(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.ringingAlarmId);
    return value ? value : null;
  } catch {
    return null;
  }
}

export async function setRingingAlarmId(id: string | null): Promise<void> {
  try {
    if (id === null) {
      await AsyncStorage.removeItem(STORAGE_KEYS.ringingAlarmId);
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEYS.ringingAlarmId, id);
  } catch {
    // Keep the UI usable even if the ringing flag fails to persist.
  }
}

export async function getOnboardingCompleted(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.onboardingCompleted);
    return value === "true";
  } catch {
    return false;
  }
}

export async function setOnboardingCompleted(completed: boolean): Promise<void> {
  try {
    if (completed) {
      await AsyncStorage.setItem(STORAGE_KEYS.onboardingCompleted, "true");
      return;
    }
    await AsyncStorage.removeItem(STORAGE_KEYS.onboardingCompleted);
  } catch {
    // Keep the flow usable even if the flag fails to persist.
  }
}
