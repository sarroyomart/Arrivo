import { View } from "react-native";

import { ColorSwatch } from "@/src/components/ColorSwatch";
import { ZONE_PALETTE } from "@/src/constants/palette";
import { useTranslation, type MessageKey } from "@/src/i18n";
import type { ZoneColorId } from "@/src/types/alarm";
import { cn } from "@/src/utils/cn";

export type ColorPalettePickerProps = {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
};

const ZONE_COLOR_KEYS: Record<ZoneColorId, MessageKey> = {
  orange: "zoneColors.orange",
  teal: "zoneColors.teal",
  blue: "zoneColors.blue",
  violet: "zoneColors.violet",
  rose: "zoneColors.rose",
  slate: "zoneColors.slate",
};

export function ColorPalettePicker({
  value,
  onChange,
  className,
}: ColorPalettePickerProps) {
  const { t } = useTranslation();

  return (
    <View className={cn("flex-row items-center justify-between", className)}>
      {ZONE_PALETTE.map((swatch) => {
        const selected = swatch.hex.toLowerCase() === value.toLowerCase();
        return (
          <ColorSwatch
            key={swatch.id}
            color={swatch.hex}
            selected={selected}
            onPress={() => onChange(swatch.hex)}
            accessibilityLabel={t("a11y.selectZoneColor", {
              color: t(ZONE_COLOR_KEYS[swatch.id]),
            })}
          />
        );
      })}
    </View>
  );
}
