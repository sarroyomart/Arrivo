import { Pressable, View } from "react-native";

import { AlarmIcon } from "@/src/components/AlarmIcon";
import { ALARM_ICON_LABEL_KEYS } from "@/src/constants/icons";
import { DEFAULT_ZONE_COLOR } from "@/src/constants/palette";
import { useTranslation } from "@/src/i18n";
import { ALARM_ICON_TYPES, type AlarmIconType } from "@/src/types/alarm";
import { cn } from "@/src/utils/cn";

export type IconPickerProps = {
  value: AlarmIconType;
  onChange: (icon: AlarmIconType) => void;
  color?: string;
  className?: string;
};

export function IconPicker({
  value,
  onChange,
  color = DEFAULT_ZONE_COLOR,
  className,
}: IconPickerProps) {
  const { t } = useTranslation();

  return (
    <View className={cn("flex-row flex-wrap gap-space-1", className)}>
      {ALARM_ICON_TYPES.map((icon) => {
        const selected = value === icon;
        return (
          <Pressable
            key={icon}
            accessibilityRole="button"
            accessibilityLabel={t("a11y.selectIcon", {
              icon: t(ALARM_ICON_LABEL_KEYS[icon]),
            })}
            accessibilityState={{ selected }}
            hitSlop={4}
            onPress={() => onChange(icon)}
            className="min-h-touch min-w-touch items-center justify-center"
          >
            <View
              className={cn(
                "items-center justify-center rounded-pill",
                selected ? "h-11 w-11 border-2 border-foreground" : "h-11 w-11",
              )}
            >
              <AlarmIcon icon={icon} color={color} size="md" />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
