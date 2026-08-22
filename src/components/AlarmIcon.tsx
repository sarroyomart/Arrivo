import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { alarmIonicon } from "@/src/constants/icons";
import { FALLBACK_ON_PRIMARY, zoneBgClass } from "@/src/constants/palette";
import { alarmIconOf, type AlarmIconType } from "@/src/types/alarm";
import { cn } from "@/src/utils/cn";

export type AlarmIconProps = {
  icon?: AlarmIconType | string;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE = {
  sm: { box: "h-6 w-6", icon: 12 },
  md: { box: "h-8 w-8", icon: 16 },
  lg: { box: "h-10 w-10", icon: 20 },
} as const;

export function AlarmIcon({
  icon,
  color,
  size = "md",
  className,
}: AlarmIconProps) {
  const resolved = alarmIconOf(icon);
  const metrics = SIZE[size];
  const fillClass = color ? zoneBgClass(color) : "bg-primary";

  return (
    <View
      className={cn(
        "items-center justify-center rounded-pill",
        metrics.box,
        fillClass,
        className,
      )}
    >
      <Ionicons
        name={alarmIonicon(resolved)}
        size={metrics.icon}
        color={FALLBACK_ON_PRIMARY}
      />
    </View>
  );
}
