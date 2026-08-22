import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { useEffect } from "react";
import { AppState } from "react-native";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import "../global.css";
import "@/src/tasks/geofencingTask";
import { ThemeProvider } from "@/src/components/ThemeProvider";
import {
  PermissionsProvider,
  usePermissions,
} from "@/src/hooks/usePermissions";
import { usePalette } from "@/src/hooks/usePalette";
import { I18nProvider, useTranslation } from "@/src/i18n";
import { syncActiveRegions } from "@/src/services/geofencing";
import { ensureLocationForegroundLifecycle } from "@/src/services/locationForeground";
import {
  consumePendingRingingAlarmId,
  ensureAlarmNotificationChannel,
  getAlarmIdFromLinkingUrl,
  openRingingScreen,
  subscribeToAlarmNotificationResponses,
} from "@/src/services/notifications";
import { getRingingAlarmId, setRingingAlarmId } from "@/src/services/storage";

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { t } = useTranslation();
  const palette = usePalette();
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const { isChecking, needsOnboarding } = usePermissions();

  useEffect(() => {
    void ensureAlarmNotificationChannel();
  }, []);

  useEffect(() => {
    if (!navigationState?.key || isChecking) {
      return;
    }

    const inOnboarding = segments[0] === "onboarding";
    const inRinging = segments[0] === "ringing";

    const openRingingIfNeeded = async (): Promise<boolean> => {
      const alarmId =
        consumePendingRingingAlarmId() ??
        getAlarmIdFromLinkingUrl(await Linking.getInitialURL().catch(() => null)) ??
        (await getRingingAlarmId());
      if (!alarmId) {
        return false;
      }
      if (!inRinging) {
        await setRingingAlarmId(alarmId);
        openRingingScreen(alarmId);
      }
      return true;
    };

    void (async () => {
      if (await openRingingIfNeeded()) {
        void SplashScreen.hideAsync();
        return;
      }

      if (needsOnboarding && !inOnboarding) {
        router.replace("/onboarding");
        return;
      }

      void SplashScreen.hideAsync();
    })();
  }, [isChecking, navigationState?.key, needsOnboarding, router, segments]);

  useEffect(() => {
    if (!navigationState?.key) {
      return;
    }

    const unsubscribe = subscribeToAlarmNotificationResponses((alarmId) => {
      void setRingingAlarmId(alarmId);
      if (segments[0] !== "ringing") {
        openRingingScreen(alarmId);
      }
    });

    const appState = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        return;
      }

      void (async () => {
        const alarmId =
          consumePendingRingingAlarmId() ??
          getAlarmIdFromLinkingUrl(await Linking.getInitialURL().catch(() => null)) ??
          (await getRingingAlarmId());
        if (alarmId && segments[0] !== "ringing") {
          openRingingScreen(alarmId);
        }
      })();
    });

    void syncActiveRegions();

    return () => {
      unsubscribe();
      appState.remove();
    };
  }, [navigationState?.key, segments]);

  useEffect(() => {
    return ensureLocationForegroundLifecycle();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: palette.canvas },
        headerTintColor: palette.foreground,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: palette.foreground },
        contentStyle: { backgroundColor: palette.canvas },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: t("nav.home"), headerBackVisible: false }}
      />
      <Stack.Screen name="alarm/[id]" options={{ title: t("nav.newAlarm") }} />
      <Stack.Screen name="map-picker" options={{ title: t("nav.mapPicker") }} />
      <Stack.Screen
        name="ringing"
        options={{
          title: t("nav.ringing"),
          headerShown: false,
          headerBackVisible: false,
          gestureEnabled: false,
          animation: "fade",
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen
        name="onboarding"
        options={{ title: t("nav.onboarding"), headerShown: false, animation: "fade" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <I18nProvider>
        <PermissionsProvider>
          <ThemeProvider>
            <RootNavigator />
          </ThemeProvider>
        </PermissionsProvider>
      </I18nProvider>
    </GestureHandlerRootView>
  );
}
