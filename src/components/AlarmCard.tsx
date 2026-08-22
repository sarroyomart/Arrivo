import { Pressable, Text, View } from "react-native";

import { alarmSoundLabelKey } from "@/src/constants/sounds";
import { useTranslation } from "@/src/i18n";
import {
  alarmTriggerOf,
  type GeoAlarm,
} from "@/src/types/alarm";
import { cn } from "@/src/utils/cn";

import { AlarmIcon } from "./AlarmIcon";
import { Badge } from "./Badge";
import { IconButton } from "./IconButton";
import { Switch } from "./Switch";

export type AlarmCardProps = {
  alarm: GeoAlarm;
  onPress?: () => void;
  onToggle?: (isActive: boolean) => void;
  onDelete?: () => void;
};

export function AlarmCard({ alarm, onPress, onToggle, onDelete }: AlarmCardProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        "rounded-card border border-border bg-card p-space-4",
        !alarm.isActive && "opacity-70",
      )}
    >
      <View className="gap-space-3">
        <View className="flex-row items-center gap-space-3">
          <AlarmIcon icon={alarm.icon} color={alarm.color} size="md" />
          <Text
            className={cn(
              "typo-h2 flex-1",
              alarm.isActive ? "text-foreground" : "text-muted",
            )}
            numberOfLines={2}
          >
            {alarm.title}
          </Text>
          <View onStartShouldSetResponder={() => true}>
            <Switch
              value={alarm.isActive}
              onValueChange={onToggle}
              accessibilityLabel={t("a11y.toggleAlarm", { title: alarm.title })}
            />
          </View>
        </View>

        <Text className="typo-body text-muted">
          {t("alarm.radiusLabel", { meters: alarm.radius })}
        </Text>

        <View className="flex-row items-center gap-space-2">
          <Badge variant="brand">
            {t(
              alarmTriggerOf(alarm.trigger) === "exit"
                ? "triggers.onExit"
                : "triggers.onEnter",
            )}
          </Badge>
          <Badge variant="outline">
            {alarm.soundConfig.mode === "custom" && alarm.soundConfig.customName
              ? alarm.soundConfig.customName
              : alarm.soundConfig.mode === "system" && alarm.soundConfig.systemName
                ? alarm.soundConfig.systemName
                : t(alarmSoundLabelKey(alarm.soundConfig))}
          </Badge>
          <View className="ml-auto" onStartShouldSetResponder={() => true}>
            <IconButton
              icon="trash-outline"
              variant="danger"
              accessibilityLabel={t("a11y.deleteAlarm", { title: alarm.title })}
              onPress={onDelete}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
