import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";

import { usePalette } from "@/src/hooks/usePalette";
import { cn } from "@/src/utils/cn";

export type SegmentedTab = {
  key: string;
  label: string;
  icon?: string;
};

export type SegmentedTabsProps = {
  tabs: Array<SegmentedTab>;
  activeTab: string;
  onTabChange: (key: string) => void;
};

type IconName = ComponentProps<typeof Ionicons>["name"];

export function SegmentedTabs({
  tabs,
  activeTab,
  onTabChange,
}: SegmentedTabsProps) {
  const palette = usePalette();

  return (
    <View
      accessibilityRole="tablist"
      className="flex-row rounded-pill bg-alarm-inactive-soft p-space-1"
    >
      {tabs.map((tab) => {
        const selected = tab.key === activeTab;
        const icon = tab.icon as IconName | undefined;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => onTabChange(tab.key)}
            className={cn(
              "min-h-touch flex-1 flex-row items-center justify-center gap-space-1 rounded-pill px-space-3",
              selected ? "bg-brand" : "bg-transparent active:bg-card",
            )}
          >
            {icon ? (
              <Ionicons
                name={icon}
                size={16}
                color={selected ? palette.onPrimary : palette.muted}
              />
            ) : null}
            <Text
              className={cn(
                "font-sans-medium text-caption",
                selected ? "text-on-primary" : "text-muted",
              )}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
