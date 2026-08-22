import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { alarmIonicon } from "@/src/constants/icons";
import { FALLBACK_ON_PRIMARY } from "@/src/constants/palette";
import { alarmIconOf, type AlarmIconType } from "@/src/types/alarm";

export type AlarmMapMarkerProps = {
  color: string;
  icon?: AlarmIconType | string;
  size?: number;
};

export function AlarmMapMarker({
  color,
  icon,
  size = 32,
}: AlarmMapMarkerProps) {
  const resolved = alarmIconOf(icon);
  const glyph = Math.round(size * 0.5);

  return (
    <View
      collapsable={false}
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: FALLBACK_ON_PRIMARY,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons
        name={alarmIonicon(resolved)}
        size={glyph}
        color={FALLBACK_ON_PRIMARY}
      />
    </View>
  );
}
