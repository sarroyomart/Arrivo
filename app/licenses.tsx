import { ScrollView, Text } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { NOTICE_TEXT } from "@/src/constants";
import { useTranslation } from "@/src/i18n";

export default function LicensesScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["bottom"]}>
      <Stack.Screen options={{ title: t("nav.licenses") }} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-space-4 pb-space-8 pt-space-2"
      >
        <Text className="typo-body text-muted">{t("legal.licensesIntro")}</Text>
        <Text className="typo-body mt-space-4">{t("legal.licensesList")}</Text>
        <Text className="typo-h2 mt-space-6">{t("legal.licensesNoticeTitle")}</Text>
        <Text className="typo-caption mt-space-2" selectable>
          {NOTICE_TEXT.trim()}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
