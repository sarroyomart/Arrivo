import { Text, View } from "react-native";

import { cn } from "@/src/utils/cn";

export type BadgeVariant = "brand" | "muted" | "outline" | "danger" | "success";

export type BadgeProps = {
  children: string;
  variant?: BadgeVariant;
  className?: string;
};

const containerClass: Record<BadgeVariant, string> = {
  brand: "bg-primary-container",
  muted: "bg-alarm-inactive-soft",
  outline: "border border-border bg-card",
  danger: "bg-danger-soft",
  success: "bg-success-soft",
};

const labelClass: Record<BadgeVariant, string> = {
  brand: "font-sans-medium text-caption text-primary",
  muted: "font-sans-medium text-caption text-muted",
  outline: "font-sans text-caption text-muted",
  danger: "font-sans-medium text-caption text-danger",
  success: "font-sans-medium text-caption text-success",
};

export function Badge({ children, variant = "brand", className }: BadgeProps) {
  return (
    <View
      className={cn(
        "items-center justify-center rounded-pill px-space-2 py-space-1",
        containerClass[variant],
        className,
      )}
    >
      <Text className={labelClass[variant]}>{children}</Text>
    </View>
  );
}
