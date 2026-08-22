import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { LEGAL_URLS } from "@/src/constants";
import { useTranslation, type MessageKey } from "@/src/i18n";

const SECTIONS: { title: MessageKey; body: MessageKey }[] = [
  { title: "legal.localTitle", body: "legal.localBody" },
  { title: "legal.networkTitle", body: "legal.networkBody" },
  { title: "legal.audioTitle", body: "legal.audioBody" },
  { title: "legal.thirdPartiesTitle", body: "legal.thirdPartiesBody" },
  { title: "legal.rightsTitle", body: "legal.rightsBody" },
  { title: "legal.contactTitle", body: "legal.contactBody" },
];

export default function PrivacyScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["bottom"]}>
      <Stack.Screen options={{ title: t("nav.privacy") }} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-space-4 pb-space-8 pt-space-2"
      >
        <Text className="typo-caption">{t("legal.privacyUpdated")}</Text>
        {SECTIONS.map((section) => (
          <View key={section.title} className="mt-space-5">
            <Text className="typo-h2">{t(section.title)}</Text>
            <Text className="typo-body mt-space-2 text-muted">{t(section.body)}</Text>
          </View>
        ))}
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            void Linking.openURL(LEGAL_URLS.privacyPolicy);
          }}
          className="mt-space-6 min-h-touch justify-center"
        >
          <Text className="typo-body-medium text-primary">{t("legal.openInBrowser")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            void Linking.openURL(LEGAL_URLS.issues);
          }}
          className="min-h-touch justify-center"
        >
          <Text className="typo-body-medium text-primary">{t("legal.openContact")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
