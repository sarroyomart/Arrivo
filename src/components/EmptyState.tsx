import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { usePalette } from "@/src/hooks/usePalette";

import { Button } from "./Button";

export type EmptyStateProps = {
  title: string;
  body: string;
  cta: string;
  onPressCta?: () => void;
};

export function EmptyState({ title, body, cta, onPressCta }: EmptyStateProps) {
  const palette = usePalette();

  return (
    <View className="flex-1 items-center justify-center px-space-6">
      <View className="h-16 w-16 items-center justify-center rounded-pill bg-primary-container">
        <Ionicons name="location-outline" size={28} color={palette.primary} />
      </View>
      <Text className="typo-title mt-space-4 text-center">{title}</Text>
      <Text className="typo-body mt-space-2 text-center text-muted">{body}</Text>
      <Button className="mt-space-6" onPress={onPressCta}>
        {cta}
      </Button>
    </View>
  );
}
