import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { GuideStep } from "@/src/components/GuideStep";
import { IconButton } from "@/src/components/IconButton";
import {
  PermissionStep,
  type PermissionStepStatus,
} from "@/src/components/PermissionStep";
import { SegmentedTabs } from "@/src/components/SegmentedTabs";
import { usePalette } from "@/src/hooks/usePalette";
import {
  usePermissions,
  type PermissionState,
} from "@/src/hooks/usePermissions";
import { useTranslation, type Locale } from "@/src/i18n";
import { cn } from "@/src/utils/cn";

type InfoTab = "permissions" | "guide";

function stepStatus(
  state: PermissionState,
  previousGranted: boolean,
): PermissionStepStatus {
  if (state === "granted" || state === "denied") {
    return state;
  }
  if (!previousGranted) {
    return "locked";
  }
  return state;
}

function LanguageToggle() {
  const { locale, setLocale, t } = useTranslation();

  const chip = (code: Locale, label: string, a11y: string) => {
    const selected = locale === code;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={a11y}
        onPress={() => setLocale(code)}
        className={cn(
          "min-h-touch min-w-touch items-center justify-center rounded-pill px-space-3",
          selected ? "bg-primary-container" : "bg-transparent",
        )}
      >
        <Text
          className={cn(
            "font-sans-semibold text-caption",
            selected ? "text-on-primary-container" : "text-muted",
          )}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View className="flex-row rounded-pill border border-border bg-card p-space-1">
      {chip("es", "ES", t("a11y.languageEs"))}
      {chip("en", "EN", t("a11y.languageEn"))}
    </View>
  );
}

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const palette = usePalette();
  const canGoBack = router.canGoBack();
  const [activeTab, setActiveTab] = useState<InfoTab>(
    canGoBack ? "guide" : "permissions",
  );
  const {
    foregroundLocation,
    backgroundLocation,
    notifications,
    fullScreenIntent,
    needsFullScreenIntent,
    needsBackgroundLocation,
    allPermissionsGranted,
    isChecking,
    requesting,
    needsOnboarding,
    requestForeground,
    requestBackground,
    requestNotifications,
    requestFullScreenIntent,
    openSettings,
    completeOnboarding,
    skipOnboarding,
    refresh,
  } = usePermissions();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const permissionCount =
    (needsBackgroundLocation ? 1 : 0) + (needsFullScreenIntent ? 1 : 0) + 2;
  const anyDenied =
    foregroundLocation === "denied" ||
    (needsBackgroundLocation && backgroundLocation === "denied") ||
    notifications === "denied" ||
    (needsFullScreenIntent &&
      notifications === "granted" &&
      fullScreenIntent !== "granted");

  const tabs = useMemo(
    () => [
      {
        key: "permissions",
        label: t("tabs.permissions"),
        icon: "shield-checkmark-outline",
      },
      { key: "guide", label: t("tabs.howTo"), icon: "book-outline" },
    ],
    [t],
  );

  const leaveOnboarding = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.dismissTo("/");
  }, [router]);

  const handleFinish = useCallback(async () => {
    await completeOnboarding();
    leaveOnboarding();
  }, [completeOnboarding, leaveOnboarding]);

  const handleSkip = useCallback(() => {
    Alert.alert(t("screens.onboarding.skipTitle"), t("screens.onboarding.skipBody"), [
      { text: t("buttons.cancel"), style: "cancel" },
      {
        text: t("permissions.skip"),
        onPress: () => {
          void skipOnboarding().then(() => {
            leaveOnboarding();
          });
        },
      },
    ]);
  }, [leaveOnboarding, skipOnboarding, t]);

  const showPermissionFooter = activeTab === "permissions" && needsOnboarding;

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false, animation: "fade" }} />

      <View className="flex-row items-center justify-between px-space-4 pt-space-2">
        <View className="min-w-touch flex-row items-center gap-space-2">
          {canGoBack ? (
            <IconButton
              icon="chevron-back"
              accessibilityLabel={t("a11y.goBack")}
              onPress={() => router.back()}
            />
          ) : null}
          <Text className="typo-h2">Arrivo</Text>
        </View>
        <LanguageToggle />
      </View>

      <View className="px-space-4 pb-space-3 pt-space-4">
        <SegmentedTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(key) => setActiveTab(key as InfoTab)}
        />
      </View>

      {activeTab === "guide" ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-space-4 pb-space-6"
        >
          <Text className="typo-display">{t("screens.guide.title")}</Text>
          <Text className="typo-body mt-space-2 text-muted">
            {t("screens.guide.subtitle")}
          </Text>
          <View className="mt-space-6 gap-space-4">
            <GuideStep
              step={1}
              icon="add-circle-outline"
              title={t("screens.guide.createTitle")}
              body={t("screens.guide.createBody")}
            />
            <GuideStep
              step={2}
              icon="toggle-outline"
              title={t("screens.guide.activateTitle")}
              body={t("screens.guide.activateBody")}
            />
            <GuideStep
              step={3}
              icon="phone-portrait-outline"
              title={t("screens.guide.tripTitle")}
              body={t("screens.guide.tripBody")}
            />
            <GuideStep
              step={4}
              icon="notifications-outline"
              title={t("screens.guide.ringTitle")}
              body={t("screens.guide.ringBody")}
            />
            <GuideStep
              step={5}
              icon="map-outline"
              title={t("screens.guide.mapTitle")}
              body={t("screens.guide.mapBody")}
            />
          </View>
        </ScrollView>
      ) : isChecking ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={palette.primary} />
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-space-4 pb-space-6"
          >
            <Text className="typo-display">{t("screens.onboarding.title")}</Text>
            <Text className="typo-body mt-space-2 text-muted">
              {t("screens.onboarding.subtitle", { count: permissionCount })}
            </Text>

            <View className="mt-space-6 gap-space-4">
              <PermissionStep
                step={1}
                icon="navigate-outline"
                title={t("permissions.locationWhenInUse.title")}
                body={t("permissions.locationWhenInUse.body")}
                footnote={
                  Platform.OS === "android"
                    ? t("permissions.locationWhenInUse.footnote")
                    : undefined
                }
                status={stepStatus(foregroundLocation, true)}
                allowLabel={t("permissions.allow")}
                grantedLabel={t("permissions.granted")}
                deniedLabel={t("permissions.denied.title")}
                openSettingsLabel={t("permissions.openSettings")}
                busy={requesting === "foreground"}
                onAllow={() => {
                  void requestForeground();
                }}
                onOpenSettings={() => {
                  void openSettings();
                }}
              />
              {needsBackgroundLocation ? (
                <PermissionStep
                  step={2}
                  icon="locate-outline"
                  title={t("permissions.locationAlways.title")}
                  body={t("permissions.locationAlways.body")}
                  footnote={t("permissions.locationAlways.footnote")}
                  status={stepStatus(
                    backgroundLocation,
                    foregroundLocation === "granted",
                  )}
                  allowLabel={t("permissions.allow")}
                  grantedLabel={t("permissions.granted")}
                  deniedLabel={t("permissions.denied.title")}
                  openSettingsLabel={t("permissions.openSettings")}
                  busy={requesting === "background"}
                  onAllow={() => {
                    void requestBackground();
                  }}
                  onOpenSettings={() => {
                    void openSettings();
                  }}
                />
              ) : null}
              <PermissionStep
                step={needsBackgroundLocation ? 3 : 2}
                icon="notifications-outline"
                title={t("permissions.notifications.title")}
                body={t("permissions.notifications.body")}
                status={stepStatus(
                  notifications,
                  needsBackgroundLocation
                    ? backgroundLocation === "granted"
                    : foregroundLocation === "granted",
                )}
                allowLabel={t("permissions.allow")}
                grantedLabel={t("permissions.granted")}
                deniedLabel={t("permissions.denied.title")}
                openSettingsLabel={t("permissions.openSettings")}
                busy={requesting === "notifications"}
                onAllow={() => {
                  void requestNotifications();
                }}
                onOpenSettings={() => {
                  void openSettings();
                }}
              />
              {needsFullScreenIntent ? (
                <PermissionStep
                  step={needsBackgroundLocation ? 4 : 3}
                  icon="phone-portrait-outline"
                  title={t("permissions.fullScreenIntent.title")}
                  body={t("permissions.fullScreenIntent.body")}
                  footnote={t("permissions.fullScreenIntent.footnote")}
                  status={stepStatus(
                    fullScreenIntent,
                    notifications === "granted",
                  )}
                  allowLabel={t("permissions.allow")}
                  grantedLabel={t("permissions.granted")}
                  deniedLabel={t("permissions.denied.title")}
                  openSettingsLabel={t("permissions.openSettings")}
                  busy={requesting === "fullScreenIntent"}
                  onAllow={() => {
                    void requestFullScreenIntent();
                  }}
                  onOpenSettings={() => {
                    void requestFullScreenIntent();
                  }}
                />
              ) : null}
            </View>

            <View className="mt-space-6 flex-row gap-space-3 rounded-card border border-border bg-card p-space-4">
              <View className="h-10 w-10 items-center justify-center rounded-pill bg-primary-container">
                <Ionicons name="lock-closed-outline" size={20} color={palette.primary} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="typo-body-medium">{t("screens.onboarding.privacyTitle")}</Text>
                <Text className="typo-caption mt-space-1">{t("screens.onboarding.privacy")}</Text>
              </View>
            </View>
          </ScrollView>

          {showPermissionFooter ? (
            <View className="border-t border-border bg-card px-space-4 pb-space-4 pt-space-3">
              {allPermissionsGranted ? (
                <Text className="typo-body-medium mb-space-2 text-center text-success">
                  {t("permissions.ready")}
                </Text>
              ) : null}
              <Button
                disabled={!allPermissionsGranted}
                onPress={() => {
                  void handleFinish();
                }}
              >
                {allPermissionsGranted
                  ? t("buttons.start")
                  : t("permissions.continue")}
              </Button>
              {anyDenied ? (
                <Button
                  variant="ghost"
                  className="mt-space-2"
                  onPress={handleSkip}
                >
                  {t("permissions.skip")}
                </Button>
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </SafeAreaView>
  );
}
