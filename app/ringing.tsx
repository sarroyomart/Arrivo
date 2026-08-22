import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { MapPreview } from "@/src/components/MapPreview";
import { StopAlarmButton } from "@/src/components/StopAlarmButton";
import {
  DEFAULT_SNOOZE_MINUTES,
  DEFAULT_ZONE_COLOR,
  RADIUS_DEFAULT_METERS,
  SNOOZE_PRESETS_MINUTES,
} from "@/src/constants";
import { usePalette } from "@/src/hooks/usePalette";
import { useTranslation } from "@/src/i18n";
import { startAlarmAudio, stopAlarmAudio, prepareAlarmAudioMode } from "@/src/services/alarmAudio";
import { syncActiveRegions } from "@/src/services/geofencing";
import {
  cancelSnoozeNotification,
  dismissAlarmNotification,
  scheduleSnoozeNotification,
} from "@/src/services/notifications";
import {
  getAlarmById,
  getRingingAlarmId,
  setRingingAlarmId,
  toggleAlarmActive,
} from "@/src/services/storage";
import { alarmTriggerOf, type GeoAlarm } from "@/src/types/alarm";
import { cn } from "@/src/utils/cn";

export default function RingingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const palette = usePalette();
  const params = useLocalSearchParams<{ id?: string }>();
  const paramId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [alarm, setAlarm] = useState<GeoAlarm | null>(null);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(false);
  const [snoozeMinutes, setSnoozeMinutes] = useState<(typeof SNOOZE_PRESETS_MINUTES)[number]>(
    DEFAULT_SNOOZE_MINUTES,
  );
  const stoppingRef = useRef(false);
  const alarmIdRef = useRef<string | null>(paramId ?? null);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);

    return () => {
      subscription.remove();
      void stopAlarmAudio();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const ringingId = paramId ?? (await getRingingAlarmId());
      alarmIdRef.current = ringingId;

      if (!ringingId) {
        if (!cancelled) {
          router.replace("/");
        }
        return;
      }

      const found = await getAlarmById(ringingId);
      if (cancelled) {
        return;
      }

      setAlarm(found);
      setLoading(false);
      if (found) {
        try {
          await prepareAlarmAudioMode();
          if (cancelled) {
            return;
          }
          await startAlarmAudio(found.soundConfig);
        } catch (error) {
          console.warn("[Arrivo] Failed to start ringing audio", error);
        }
      }

      if (!paramId) {
        router.setParams({ id: ringingId });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paramId, router]);

  const leaveRinging = useCallback(async () => {
    await setRingingAlarmId(null);
    router.replace("/");
  }, [router]);

  const handleStop = useCallback(async () => {
    if (stoppingRef.current) {
      return;
    }
    stoppingRef.current = true;
    setStopping(true);

    const alarmId = alarmIdRef.current ?? alarm?.id ?? paramId ?? null;

    await stopAlarmAudio();
    if (alarmId) {
      await dismissAlarmNotification(alarmId);
      await cancelSnoozeNotification(alarmId);
      await toggleAlarmActive(alarmId, false);
      await syncActiveRegions();
    }
    await leaveRinging();
  }, [alarm?.id, leaveRinging, paramId]);

  const handleSnooze = useCallback(async () => {
    if (stoppingRef.current) {
      return;
    }
    stoppingRef.current = true;
    setStopping(true);

    const current = alarm;
    const alarmId = alarmIdRef.current ?? current?.id ?? paramId ?? null;

    await stopAlarmAudio();
    if (alarmId) {
      await dismissAlarmNotification(alarmId);
    }
    if (current) {
      await scheduleSnoozeNotification(current, snoozeMinutes);
    }
    await leaveRinging();
  }, [alarm, leaveRinging, paramId, snoozeMinutes]);

  return (
    <SafeAreaView className="flex-1 bg-danger-soft">
      <Stack.Screen
        options={{
          title: t("nav.ringing"),
          headerShown: false,
          headerBackVisible: false,
          gestureEnabled: false,
          animation: "fade",
        }}
      />

      <View className="flex-1 px-space-6 py-space-8">
        <View className="h-14 w-14 items-center justify-center rounded-pill bg-danger">
          <Ionicons
            name={alarmTriggerOf(alarm?.trigger) === "exit" ? "exit-outline" : "navigate"}
            size={28}
            color={palette.onPrimary}
          />
        </View>

        <Text className="typo-display mt-space-6 text-danger">
          {alarmTriggerOf(alarm?.trigger) === "exit"
            ? t("screens.ringing.titleExit")
            : t("screens.ringing.title")}
        </Text>
        <Text className="typo-title mt-space-2">
          {alarm?.title ??
            (alarmTriggerOf(alarm?.trigger) === "exit"
              ? t("screens.ringing.subtitleExit")
              : t("screens.ringing.subtitle"))}
        </Text>

        {loading ? (
          <View className="mt-space-6 h-36 items-center justify-center rounded-card bg-map">
            <ActivityIndicator color={palette.danger} />
          </View>
        ) : (
          <MapPreview
            latitude={alarm?.latitude}
            longitude={alarm?.longitude}
            radius={alarm?.radius ?? RADIUS_DEFAULT_METERS}
            color={alarm?.color ?? DEFAULT_ZONE_COLOR}
            icon={alarm?.icon}
            className="mt-space-6"
          />
        )}

        <View className="flex-1" />

        <Text className="typo-caption mb-space-3 text-center">
          {t("screens.ringing.snoozeHint", { minutes: snoozeMinutes })}
        </Text>

        <View className="mb-space-3 flex-row gap-space-2">
          {SNOOZE_PRESETS_MINUTES.map((minutes) => {
            const selected = snoozeMinutes === minutes;
            return (
              <Pressable
                key={minutes}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: stopping }}
                accessibilityLabel={t("a11y.snoozeFor", { minutes })}
                disabled={stopping}
                onPress={() => setSnoozeMinutes(minutes)}
                className={cn(
                  "min-h-touch flex-1 items-center justify-center rounded-control",
                  selected ? "bg-primary-container" : "border border-border bg-card",
                )}
              >
                <Text
                  className={cn(
                    "typo-caption",
                    selected
                      ? "font-sans-medium text-on-primary-container"
                      : "text-foreground",
                  )}
                >
                  {t("buttons.snoozeMinutes", { minutes })}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("buttons.snooze")}
          accessibilityState={{ disabled: stopping }}
          disabled={stopping}
          onPress={() => void handleSnooze()}
          className={cn(
            "mb-space-3 min-h-touch w-full items-center justify-center rounded-pill border border-border bg-card px-space-6 py-space-3 active:opacity-80",
            stopping && "opacity-disabled",
          )}
        >
          <Text className="typo-button text-foreground">{t("buttons.snooze")}</Text>
        </Pressable>

        <StopAlarmButton disabled={stopping} onPress={() => void handleStop()}>
          {t("buttons.stopAlarm")}
        </StopAlarmButton>
      </View>
    </SafeAreaView>
  );
}
