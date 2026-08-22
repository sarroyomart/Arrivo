import {
  alarmSystemToneOf,
  type AlarmSoundConfig,
  type AlarmSystemTone,
} from "@/src/types/alarm";
import type { MessageKey } from "@/src/i18n";

export const ALARM_SOUND_ASSETS: Record<AlarmSystemTone, number> = {
  default: require("../../assets/sounds/alarm.wav") as number,
  gentle: require("../../assets/sounds/gentle.wav") as number,
  urgent: require("../../assets/sounds/urgent.wav") as number,
};

export const ALARM_SOUND_FILES: Record<AlarmSystemTone, string> = {
  default: "alarm.wav",
  gentle: "gentle.wav",
  urgent: "urgent.wav",
};

export const ALARM_SYSTEM_TONE_LABEL_KEYS: Record<AlarmSystemTone, MessageKey> = {
  default: "sounds.default",
  gentle: "sounds.gentle",
  urgent: "sounds.urgent",
};

export const ANDROID_ALARM_CHANNEL_IDS = {
  default: "arrivo_alarm_default_v2",
  gentle: "arrivo_alarm_gentle_v2",
  urgent: "arrivo_alarm_urgent_v2",
  system: "arrivo_alarm_system_v2",
  vibration: "arrivo_alarm_vibrate_v2",
  custom: "arrivo_alarm_custom_v2",
} as const;

export function androidChannelIdFor(config: AlarmSoundConfig): string {
  if (config.mode === "vibration") {
    return ANDROID_ALARM_CHANNEL_IDS.vibration;
  }
  if (config.mode === "custom") {
    return ANDROID_ALARM_CHANNEL_IDS.custom;
  }
  if (config.systemUri) {
    return ANDROID_ALARM_CHANNEL_IDS.system;
  }
  return ANDROID_ALARM_CHANNEL_IDS[alarmSystemToneOf(config.systemTone)];
}

export function alarmSoundLabelKey(config: AlarmSoundConfig): MessageKey {
  if (config.mode === "vibration") {
    return "sounds.vibration";
  }
  if (config.mode === "custom") {
    return "sounds.modeCustom";
  }
  if (config.systemName) {
    return "sounds.modeSystem";
  }
  return ALARM_SYSTEM_TONE_LABEL_KEYS[config.systemTone ?? "default"];
}
