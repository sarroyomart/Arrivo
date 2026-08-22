export type SystemSoundKind = "alarm" | "notification" | "ringtone";

export type SystemSoundItem = {
  title: string;
  uri: string;
  isDefault: boolean;
};
