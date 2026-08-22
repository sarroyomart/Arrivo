import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";

import { usePalette } from "@/src/hooks/usePalette";

type IconName = ComponentProps<typeof Ionicons>["name"];

export type GuideStepProps = {
  step: number;
  icon: IconName;
  title: string;
  body: string;
};

export function GuideStep({ step, icon, title, body }: GuideStepProps) {
  const palette = usePalette();

  return (
    <View className="rounded-card border border-border bg-card p-space-4">
      <View className="flex-row gap-space-3">
        <View className="h-8 w-8 items-center justify-center rounded-pill bg-brand">
          <Text className="font-sans-semibold text-caption text-on-primary">
            {step}
          </Text>
        </View>
        <View className="min-w-0 flex-1 gap-space-3">
          <View className="flex-row items-center gap-space-2">
            <View className="h-10 w-10 items-center justify-center rounded-pill bg-primary-container">
              <Ionicons name={icon} size={22} color={palette.primary} />
            </View>
            <Text className="typo-h2 flex-1" numberOfLines={2}>
              {title}
            </Text>
          </View>
          <Text className="typo-body text-muted">{body}</Text>
        </View>
      </View>
    </View>
  );
}
