import { Pressable, Text } from "react-native";

import { cn } from "@/src/utils/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "default" | "sm";

export type ButtonProps = {
  children: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  accessibilityLabel?: string;
  className?: string;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-brand active:bg-brand-hover",
  secondary: "border border-border bg-card active:bg-canvas",
  danger: "bg-danger active:opacity-80",
  ghost: "bg-transparent active:bg-alarm-inactive-soft",
};

const labelClass: Record<ButtonVariant, string> = {
  primary: "text-on-primary",
  secondary: "text-foreground",
  danger: "text-on-primary",
  ghost: "text-foreground",
};

const sizeClass: Record<ButtonSize, string> = {
  default: "min-h-touch px-space-4 py-space-3",
  sm: "min-h-10 px-space-3 py-space-2",
};

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "default",
  disabled = false,
  accessibilityLabel,
  className,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        "flex-row items-center justify-center rounded-control",
        variantClass[variant],
        sizeClass[size],
        disabled && "opacity-disabled",
        className,
      )}
    >
      <Text className={cn("typo-button", labelClass[variant])}>{children}</Text>
    </Pressable>
  );
}
