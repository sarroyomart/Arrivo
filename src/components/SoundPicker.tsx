import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";

import {
  canUseAndroidSystemSounds,
  listSystemSoundPicks,
  type SystemSoundItem,
} from "@/modules/system-sounds";
import { Button } from "@/src/components/Button";
import { SegmentedTabs } from "@/src/components/SegmentedTabs";
import { ALARM_SYSTEM_TONE_LABEL_KEYS } from "@/src/constants";
import { usePalette } from "@/src/hooks/usePalette";
import { useTranslation } from "@/src/i18n";
import { previewAlarmSound, stopAlarmPreview } from "@/src/services/alarmAudio";
import {
  isAllowedCustomSound,
  persistCustomSound,
} from "@/src/services/customSound";
import {
  ALARM_SYSTEM_TONES,
  alarmSystemToneOf,
  type AlarmSoundConfig,
  type AlarmSoundMode,
  type AlarmSystemTone,
} from "@/src/types/alarm";
import { cn } from "@/src/utils/cn";

export type SoundPickerProps = {
  value: AlarmSoundConfig;
  onChange: (config: AlarmSoundConfig) => void;
  className?: string;
};

const SYSTEM_SOUND_PICKS = 10;

export function SoundPicker({ value, onChange, className }: SoundPickerProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const [picking, setPicking] = useState(false);
  const [systemSounds, setSystemSounds] = useState<SystemSoundItem[]>([]);
  const [loadingSounds, setLoadingSounds] = useState(false);
  const [soundsError, setSoundsError] = useState(false);
  const androidSystem = canUseAndroidSystemSounds();

  useEffect(() => {
    return () => {
      stopAlarmPreview();
    };
  }, []);

  useEffect(() => {
    if (value.mode !== "system" || !androidSystem) {
      return;
    }

    let cancelled = false;
    setLoadingSounds(true);
    setSoundsError(false);

    void listSystemSoundPicks(SYSTEM_SOUND_PICKS)
      .then((items) => {
        if (cancelled) {
          return;
        }
        setSystemSounds(items);
        if (!value.systemUri && items[0]) {
          onChange({
            mode: "system",
            systemUri: items[0].uri,
            systemName: items[0].title,
            systemKind: "alarm",
            customUri: value.customUri,
            customName: value.customName,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSoundsError(true);
          setSystemSounds([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSounds(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // Reload when entering system mode, not on every config edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [androidSystem, value.mode]);

  const setMode = (mode: AlarmSoundMode) => {
    onChange({
      ...value,
      mode,
      systemKind: value.systemKind ?? "alarm",
      systemTone: alarmSystemToneOf(value.systemTone),
    });
  };

  const setTone = (systemTone: AlarmSystemTone) => {
    onChange({
      ...value,
      mode: "system",
      systemTone,
    });
  };

  const setSystemSound = (item: SystemSoundItem) => {
    onChange({
      ...value,
      mode: "system",
      systemUri: item.uri,
      systemName: item.title,
      systemKind: "alarm",
    });
  };

  const pickCustomFile = async () => {
    if (picking) {
      return;
    }
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      if (!isAllowedCustomSound(asset.name, asset.mimeType)) {
        Alert.alert(t("errors.unsupportedAudio"));
        return;
      }

      const persisted = await persistCustomSound(asset.uri, asset.name, asset.mimeType);
      const next: AlarmSoundConfig = {
        ...value,
        mode: "custom",
        customUri: persisted.uri,
        customName: persisted.name,
      };
      onChange(next);
      void previewAlarmSound(next);
    } catch {
      Alert.alert(t("errors.customSoundFailed"));
    } finally {
      setPicking(false);
    }
  };

  return (
    <View className={cn("gap-space-3", className)}>
      <SegmentedTabs
        tabs={[
          { key: "system", label: t("sounds.modeSystem") },
          { key: "custom", label: t("sounds.modeCustom") },
          { key: "vibration", label: t("sounds.modeVibration") },
        ]}
        activeTab={value.mode}
        onTabChange={(key) => setMode(key as AlarmSoundMode)}
      />

      {value.mode === "system" && androidSystem ? (
        <View className="gap-space-3">
          <Text className="typo-caption">{t("sounds.systemHint")}</Text>
          {loadingSounds ? (
            <View className="min-h-touch items-center justify-center">
              <ActivityIndicator color={palette.primary} />
            </View>
          ) : soundsError ? (
            <Text className="typo-caption text-danger">{t("sounds.systemLoadFailed")}</Text>
          ) : (
            <View className="gap-space-2">
              {systemSounds.map((item) => {
                const selected = value.systemUri === item.uri;
                return (
                  <Pressable
                    key={item.uri}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setSystemSound(item)}
                    className={cn(
                      "min-h-touch flex-row items-center rounded-control px-space-3",
                      selected ? "bg-primary-container" : "border border-border bg-card",
                    )}
                  >
                    <Text
                      className={cn(
                        "typo-body flex-1",
                        selected
                          ? "font-sans-medium text-on-primary-container"
                          : "text-foreground",
                      )}
                      numberOfLines={1}
                    >
                      {item.isDefault
                        ? t("sounds.systemDefault", { name: item.title })
                        : item.title}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("a11y.previewSound", { sound: item.title })}
                      hitSlop={8}
                      onPress={() => {
                        setSystemSound(item);
                        void previewAlarmSound({
                          mode: "system",
                          systemUri: item.uri,
                          systemName: item.title,
                          systemKind: "alarm",
                        });
                      }}
                      className="h-10 w-10 items-center justify-center rounded-pill active:opacity-70"
                    >
                      <Ionicons
                        name="play"
                        size={20}
                        color={selected ? palette.onPrimaryContainer : palette.muted}
                      />
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ) : null}

      {value.mode === "system" && !androidSystem ? (
        <View className="gap-space-2">
          <Text className="typo-caption">{t("sounds.systemHintIos")}</Text>
          {ALARM_SYSTEM_TONES.map((tone) => {
            const selected = alarmSystemToneOf(value.systemTone) === tone;
            return (
              <Pressable
                key={tone}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setTone(tone)}
                className={cn(
                  "min-h-touch flex-row items-center rounded-control px-space-3",
                  selected ? "bg-primary-container" : "border border-border bg-card",
                )}
              >
                <Text
                  className={cn(
                    "typo-body flex-1",
                    selected
                      ? "font-sans-medium text-on-primary-container"
                      : "text-foreground",
                  )}
                >
                  {t(ALARM_SYSTEM_TONE_LABEL_KEYS[tone])}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("a11y.previewSound", {
                    sound: t(ALARM_SYSTEM_TONE_LABEL_KEYS[tone]),
                  })}
                  hitSlop={8}
                  onPress={() => {
                    setTone(tone);
                    void previewAlarmSound({ mode: "system", systemTone: tone });
                  }}
                  className="h-10 w-10 items-center justify-center rounded-pill active:opacity-70"
                >
                  <Ionicons
                    name="play"
                    size={20}
                    color={selected ? palette.onPrimaryContainer : palette.muted}
                  />
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {value.mode === "custom" ? (
        <View className="gap-space-3 rounded-card border border-border bg-card p-space-4">
          <Text className="typo-caption">{t("sounds.customHint")}</Text>
          <Text className="typo-body" numberOfLines={2}>
            {value.customName ?? t("sounds.noFile")}
          </Text>
          <View className="flex-row items-center gap-space-2">
            <View className="flex-1">
              <Button
                variant="secondary"
                disabled={picking}
                onPress={() => {
                  void pickCustomFile();
                }}
                accessibilityLabel={t("a11y.pickCustomSound")}
              >
                {value.customUri ? t("sounds.changeFile") : t("sounds.pickFile")}
              </Button>
            </View>
            {value.customUri ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("a11y.previewSound", {
                  sound: value.customName ?? t("sounds.modeCustom"),
                })}
                onPress={() => {
                  void previewAlarmSound(value);
                }}
                className="h-touch w-touch items-center justify-center rounded-pill border border-border active:opacity-70"
              >
                <Ionicons name="play" size={20} color={palette.primary} />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {value.mode === "vibration" ? (
        <View className="gap-space-3 rounded-card border border-border bg-card p-space-4">
          <Text className="typo-caption">{t("sounds.vibrationHint")}</Text>
          <Button
            variant="secondary"
            onPress={() => {
              void previewAlarmSound({ mode: "vibration" });
            }}
            accessibilityLabel={t("a11y.previewSound", {
              sound: t("sounds.vibration"),
            })}
          >
            {t("sounds.vibration")}
          </Button>
        </View>
      ) : null}
    </View>
  );
}
