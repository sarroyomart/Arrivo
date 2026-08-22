import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { usePalette } from "@/src/hooks/usePalette";
import { cn } from "@/src/utils/cn";

import { Badge } from "./Badge";
import { Button } from "./Button";

export type PermissionStepStatus = "pending" | "granted" | "denied" | "locked";

type IconName = ComponentProps<typeof Ionicons>["name"];

export type PermissionStepProps = {
  step: number;
  icon: IconName;
  title: string;
  body: string;
  footnote?: string;
  status: PermissionStepStatus;
  allowLabel: string;
  grantedLabel: string;
  deniedLabel: string;
  openSettingsLabel: string;
  onAllow?: () => void;
  onOpenSettings?: () => void;
  busy?: boolean;
};

export function PermissionStep({
  step,
  icon,
  title,
  body,
  footnote,
  status,
  allowLabel,
  grantedLabel,
  deniedLabel,
  openSettingsLabel,
  onAllow,
  onOpenSettings,
  busy = false,
}: PermissionStepProps) {
  const palette = usePalette();
  const locked = status === "locked";

  const iconColor =
    status === "granted"
      ? palette.success
      : status === "denied"
        ? palette.danger
        : locked
          ? palette.muted
          : palette.primary;

  const stepNumberClass =
    status === "granted"
      ? "bg-success"
      : status === "denied"
        ? "bg-danger"
        : status === "pending"
          ? "bg-brand"
          : "bg-alarm-inactive-soft";

  const stepNumberTextClass =
    status === "locked" ? "text-muted" : "text-on-primary";

  return (
    <View
      accessibilityState={{ disabled: locked }}
      pointerEvents={locked ? "none" : "auto"}
      className={cn(
        "rounded-card border bg-card p-space-4",
        status === "pending" && "border-2 border-brand",
        status === "granted" && "border border-border",
        status === "denied" && "border border-danger",
        locked && "border border-border opacity-disabled",
      )}
    >
      <View className="flex-row gap-space-3">
        <View
          className={cn(
            "h-8 w-8 items-center justify-center rounded-pill",
            stepNumberClass,
          )}
        >
          <Text className={cn("font-sans-semibold text-caption", stepNumberTextClass)}>
            {step}
          </Text>
        </View>

        <View className="min-w-0 flex-1 gap-space-3">
          <View className="flex-row items-center gap-space-2">
            <View
              className={cn(
                "h-10 w-10 items-center justify-center rounded-pill",
                status === "granted"
                  ? "bg-success-soft"
                  : status === "denied"
                    ? "bg-danger-soft"
                    : "bg-primary-container",
              )}
            >
              <Ionicons
                name={status === "granted" ? "checkmark-circle" : icon}
                size={22}
                color={iconColor}
              />
            </View>
            <Text className="typo-h2 flex-1" numberOfLines={2}>
              {title}
            </Text>
            {status === "granted" ? (
              <Badge variant="success">{grantedLabel}</Badge>
            ) : null}
            {status === "denied" ? (
              <Badge variant="danger">{deniedLabel}</Badge>
            ) : null}
          </View>

          <Text className="typo-body text-muted">{body}</Text>

          {footnote ? (
            <Text className="typo-caption text-muted">{footnote}</Text>
          ) : null}

          {status === "pending" ? (
            <View className="flex-row items-center gap-space-3">
              <View className="flex-1">
                <Button
                  className="w-full"
                  disabled={busy}
                  onPress={onAllow}
                  accessibilityLabel={allowLabel}
                >
                  {allowLabel}
                </Button>
              </View>
              {busy ? <ActivityIndicator color={palette.primary} /> : null}
            </View>
          ) : null}

          {status === "denied" ? (
            <Button
              variant="secondary"
              className="w-full"
              disabled={busy}
              onPress={onOpenSettings}
              accessibilityLabel={openSettingsLabel}
            >
              {openSettingsLabel}
            </Button>
          ) : null}

          {status === "granted" ? (
            <View className="min-h-touch flex-row items-center gap-space-2">
              <Ionicons name="checkmark-circle" size={20} color={palette.success} />
              <Text className="typo-body-medium text-success">{grantedLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
