import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

import type { AlarmIconType } from "@/src/types/alarm";
import type { MessageKey } from "@/src/i18n";

type IconName = ComponentProps<typeof Ionicons>["name"];

export const ALARM_ICON_IONICONS: Record<AlarmIconType, IconName> = {
  pin: "location",
  home: "home",
  briefcase: "briefcase",
  school: "school",
  train: "train",
  "shopping-cart": "cart",
  dumbbell: "barbell",
  coffee: "cafe",
};

export const ALARM_ICON_LABEL_KEYS: Record<AlarmIconType, MessageKey> = {
  pin: "icons.pin",
  home: "icons.home",
  briefcase: "icons.briefcase",
  school: "icons.school",
  train: "icons.train",
  "shopping-cart": "icons.shopping-cart",
  dumbbell: "icons.dumbbell",
  coffee: "icons.coffee",
};

export function alarmIonicon(icon: AlarmIconType): IconName {
  return ALARM_ICON_IONICONS[icon];
}
