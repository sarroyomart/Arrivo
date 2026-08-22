export type AlarmTrigger = "enter" | "exit";

export const DEFAULT_ALARM_TRIGGER: AlarmTrigger = "enter";

export function alarmTriggerOf(value: unknown): AlarmTrigger {
  return value === "exit" ? "exit" : DEFAULT_ALARM_TRIGGER;
}

export type AlarmIconType =
  | "pin"
  | "home"
  | "briefcase"
  | "school"
  | "train"
  | "shopping-cart"
  | "dumbbell"
  | "coffee";

export const ALARM_ICON_TYPES: readonly AlarmIconType[] = [
  "pin",
  "home",
  "briefcase",
  "school",
  "train",
  "shopping-cart",
  "dumbbell",
  "coffee",
] as const;

export const DEFAULT_ALARM_ICON: AlarmIconType = "pin";

export function alarmIconOf(value: unknown): AlarmIconType {
  return ALARM_ICON_TYPES.includes(value as AlarmIconType)
    ? (value as AlarmIconType)
    : DEFAULT_ALARM_ICON;
}

export type AlarmSoundMode = "system" | "custom" | "vibration";

/** Bundled tones used on iOS, where the OS ringtone catalog is not available. */
export type AlarmSystemTone = "default" | "gentle" | "urgent";

export type SystemSoundKind = "alarm" | "notification" | "ringtone";

export const ALARM_SOUND_MODES: readonly AlarmSoundMode[] = [
  "system",
  "custom",
  "vibration",
] as const;

export const ALARM_SYSTEM_TONES: readonly AlarmSystemTone[] = [
  "default",
  "gentle",
  "urgent",
] as const;

export const SYSTEM_SOUND_KINDS: readonly SystemSoundKind[] = [
  "alarm",
  "notification",
  "ringtone",
] as const;

export type AlarmSoundConfig = {
  mode: AlarmSoundMode;
  /** Android RingtoneManager content:// URI. */
  systemUri?: string;
  systemName?: string;
  systemKind?: SystemSoundKind;
  /** iOS bundled fallback when the system catalog is unavailable. */
  systemTone?: AlarmSystemTone;
  customUri?: string;
  customName?: string;
};

export const DEFAULT_ALARM_SOUND_CONFIG: AlarmSoundConfig = {
  mode: "system",
  systemKind: "alarm",
  systemTone: "default",
};

export function alarmSystemToneOf(value: unknown): AlarmSystemTone {
  return ALARM_SYSTEM_TONES.includes(value as AlarmSystemTone)
    ? (value as AlarmSystemTone)
    : "default";
}

export function systemSoundKindOf(value: unknown): SystemSoundKind {
  return SYSTEM_SOUND_KINDS.includes(value as SystemSoundKind)
    ? (value as SystemSoundKind)
    : "alarm";
}

function isSoundMode(value: unknown): value is AlarmSoundMode {
  return ALARM_SOUND_MODES.includes(value as AlarmSoundMode);
}

function systemFields(config: Record<string, unknown>): Pick<
  AlarmSoundConfig,
  "systemUri" | "systemName" | "systemKind" | "systemTone"
> {
  return {
    systemUri: typeof config.systemUri === "string" ? config.systemUri : undefined,
    systemName: typeof config.systemName === "string" ? config.systemName : undefined,
    systemKind: systemSoundKindOf(config.systemKind),
    systemTone: alarmSystemToneOf(config.systemTone),
  };
}

/** Maps a stored `soundConfig` or a legacy flat `sound` field into the current shape. */
export function alarmSoundConfigOf(
  value: unknown,
  legacySound?: unknown,
): AlarmSoundConfig {
  if (typeof value === "object" && value !== null) {
    const config = value as Record<string, unknown>;
    if (isSoundMode(config.mode)) {
      if (config.mode === "custom") {
        return {
          mode: "custom",
          ...systemFields(config),
          customUri: typeof config.customUri === "string" ? config.customUri : undefined,
          customName: typeof config.customName === "string" ? config.customName : undefined,
        };
      }
      if (config.mode === "vibration") {
        return { mode: "vibration" };
      }
      return {
        mode: "system",
        ...systemFields(config),
      };
    }
  }

  const legacy = typeof value === "string" ? value : legacySound;
  if (legacy === "vibration_only" || legacy === "vibration") {
    return { mode: "vibration" };
  }
  if (legacy === "gentle" || legacy === "urgent" || legacy === "default") {
    return {
      mode: "system",
      systemKind: "alarm",
      systemTone: alarmSystemToneOf(legacy),
    };
  }

  return { ...DEFAULT_ALARM_SOUND_CONFIG };
}

export function isSilentSoundConfig(config: AlarmSoundConfig): boolean {
  return config.mode === "vibration";
}

export type GeoAlarm = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  radius: number; // 100–5000
  color: string; // hex de paleta
  icon: AlarmIconType;
  soundConfig: AlarmSoundConfig;
  trigger: AlarmTrigger;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ZoneColorId =
  | "orange"
  | "teal"
  | "blue"
  | "violet"
  | "rose"
  | "slate";
