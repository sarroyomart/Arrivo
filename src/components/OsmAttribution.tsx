import { Linking, Pressable, Text, type StyleProp, type ViewStyle } from "react-native";

import { LEGAL_URLS, OSM_ATTRIBUTION } from "@/src/constants";
import { useTranslation } from "@/src/i18n";
import { cn } from "@/src/utils/cn";

type OsmAttributionProps = {
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function OsmAttribution({ className, style }: OsmAttributionProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={t("a11y.osmAttribution")}
      hitSlop={8}
      onPress={() => {
        void Linking.openURL(LEGAL_URLS.osmCopyright);
      }}
      className={cn("self-start", className)}
      style={style}
    >
      <Text className="typo-caption text-primary">{OSM_ATTRIBUTION}</Text>
    </Pressable>
  );
}
