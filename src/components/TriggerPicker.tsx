import { Pressable, Text, View } from "react-native";

import { useTranslation } from "@/src/i18n";
import type { AlarmTrigger } from "@/src/types/alarm";
import { cn } from "@/src/utils/cn";

export type TriggerPickerProps = {
  value: AlarmTrigger;
  onChange: (trigger: AlarmTrigger) => void;
  className?: string;
};

const OPTIONS: {
  value: AlarmTrigger;
  labelKey: "screens.alarm.triggerOnEnter" | "screens.alarm.triggerOnExit";
}[] = [
  { value: "enter", labelKey: "screens.alarm.triggerOnEnter" },
  { value: "exit", labelKey: "screens.alarm.triggerOnExit" },
];

export function TriggerPicker({ value, onChange, className }: TriggerPickerProps) {
  const { t } = useTranslation();

  return (
    <View className={cn("flex-row flex-wrap gap-space-2", className)}>
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={cn(
              "min-h-touch flex-1 items-center justify-center rounded-control px-space-3",
              selected ? "bg-primary-container" : "border border-border bg-card",
            )}
          >
            <Text
              className={cn(
                "typo-caption text-center",
                selected
                  ? "font-sans-medium text-on-primary-container"
                  : "text-muted",
              )}
            >
              {t(option.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
