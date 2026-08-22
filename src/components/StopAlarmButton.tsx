import { Pressable, Text } from "react-native";

import { cn } from "@/src/utils/cn";

export type StopAlarmButtonProps = {
  children: string;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function StopAlarmButton({
  children,
  onPress,
  disabled = false,
  accessibilityLabel,
}: StopAlarmButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        "min-h-16 w-full items-center justify-center rounded-pill bg-danger px-space-6 py-space-4 active:opacity-80",
        disabled && "opacity-disabled",
      )}
    >
      <Text className="typo-button text-on-primary">{children}</Text>
    </Pressable>
  );
}
