import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

import { FALLBACK_ON_PRIMARY, zoneBgClass } from "@/src/constants/palette";
import { cn } from "@/src/utils/cn";

export type ColorSwatchProps = {
  color: string;
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
};

export function ColorSwatch({
  color,
  selected = false,
  onPress,
  accessibilityLabel,
  disabled = false,
}: ColorSwatchProps) {
  const fillClass = zoneBgClass(color);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      className={cn(
        "min-h-touch min-w-touch items-center justify-center",
        disabled && "opacity-disabled",
      )}
    >
      <View
        className={cn(
          "items-center justify-center rounded-pill",
          selected ? "h-9 w-9 border-2 border-foreground" : "h-8 w-8",
        )}
      >
        <View
          className={cn(
            "items-center justify-center rounded-pill",
            selected ? "h-6 w-6" : "h-7 w-7",
            fillClass,
          )}
        >
          {selected ? (
            <Ionicons name="checkmark" size={14} color={FALLBACK_ON_PRIMARY} />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
