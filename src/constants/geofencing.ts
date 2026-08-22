export const GEOFENCE_TASK_NAME = "ARRIVO_GEOFENCE";

export const MAX_ACTIVE_GEOFENCES = 20;

export const RADIUS_MIN_METERS = 100;
export const RADIUS_MAX_METERS = 5000;
export const RADIUS_DEFAULT_METERS = 200;
export const RADIUS_STEP_METERS = 50;
export const RADIUS_PRESETS_METERS = [100, 500, 1000] as const;

export function snapRadius(meters: number): number {
  const clamped = Math.min(RADIUS_MAX_METERS, Math.max(RADIUS_MIN_METERS, meters));
  return Math.round(clamped / RADIUS_STEP_METERS) * RADIUS_STEP_METERS;
}

export function isRadiusPreset(meters: number): boolean {
  return (RADIUS_PRESETS_METERS as readonly number[]).includes(meters);
}

export const STORAGE_KEYS = {
  alarms: "@arrivo_alarms",
  ringingAlarmId: "@arrivo_ringingAlarmId",
  onboardingCompleted: "@arrivo_onboarding_completed",
} as const;

export const ANDROID_ALARM_CHANNEL_ID = "arrivo_alarm_channel_v2";
export const ANDROID_ALARM_SOUND = "alarm.wav";
export const ALARM_NOTIFICATION_CATEGORY = "ALARM";
export const RINGING_NOTIFICATION_ACTION = "RINGING";
export const RINGING_PATH = "/ringing";

export const LEGACY_ANDROID_ALARM_CHANNEL_IDS = [
  "amithere_alarm_channel",
  "amithere_alarm_channel_v2",
  "amithere_alarm_default",
  "amithere_alarm_default_v2",
  "amithere_alarm_gentle",
  "amithere_alarm_gentle_v2",
  "amithere_alarm_urgent",
  "amithere_alarm_urgent_v2",
  "amithere_alarm_system",
  "amithere_alarm_system_v2",
  "amithere_alarm_custom",
  "amithere_alarm_custom_v2",
  "amithere_alarm_vibrate",
  "amithere_alarm_vibrate_v2",
] as const;

export const SNOOZE_PRESETS_MINUTES = [2, 5, 10] as const;
export const DEFAULT_SNOOZE_MINUTES = 2;
