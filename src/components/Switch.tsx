import { Pressable, View } from "react-native";

import { cn } from "@/src/utils/cn";

export type SwitchProps = {
  value: boolean;
  onValueChange?: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function Switch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: SwitchProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onValueChange?.(!value)}
      className={cn(
        "min-h-touch min-w-touch items-center justify-center",
        disabled && "opacity-disabled",
      )}
    >
      <View
        className={cn(
          "h-6 w-11 flex-row items-center rounded-pill p-0.5",
          value ? "justify-end bg-brand" : "justify-start bg-alarm-inactive-soft",
        )}
      >
        <View className="h-5 w-5 rounded-pill bg-card" />
      </View>
    </Pressable>
  );
}
