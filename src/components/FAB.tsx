import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePalette } from "@/src/hooks/usePalette";
import { cn } from "@/src/utils/cn";

export type FABProps = {
  onPress?: () => void;
  accessibilityLabel: string;
  className?: string;
};

export function FAB({ onPress, accessibilityLabel, className }: FABProps) {
  const insets = useSafeAreaInsets();
  const palette = usePalette();

  return (
    <View
      pointerEvents="box-none"
      className="absolute right-space-6"
      style={{ bottom: Math.max(insets.bottom, 16) + 8 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        className={cn(
          "h-14 w-14 items-center justify-center rounded-pill bg-brand shadow-map active:bg-brand-hover",
          className,
        )}
        style={{ elevation: 4 }}
      >
        <Ionicons name="add" size={28} color={palette.onPrimary} />
      </Pressable>
    </View>
  );
}
