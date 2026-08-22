import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable } from "react-native";

import { usePalette } from "@/src/hooks/usePalette";
import { cn } from "@/src/utils/cn";

type IconName = ComponentProps<typeof Ionicons>["name"];
type IconButtonVariant = "ghost" | "container" | "danger";

export type IconButtonProps = {
  icon: IconName;
  onPress?: () => void;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  disabled?: boolean;
  className?: string;
};

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = "ghost",
  disabled = false,
  className,
}: IconButtonProps) {
  const palette = usePalette();
  const iconColor =
    variant === "container"
      ? palette.onPrimaryContainer
      : variant === "danger"
        ? palette.danger
        : palette.foreground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      className={cn(
        "items-center justify-center rounded-pill",
        variant === "container"
          ? "h-10 w-10 bg-primary-container active:opacity-80"
          : "h-touch w-touch active:bg-alarm-inactive-soft",
        disabled && "opacity-disabled",
        className,
      )}
    >
      <Ionicons name={icon} size={22} color={iconColor} />
    </Pressable>
  );
}
