import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { Button } from "@/src/components/Button";
import { ColorPalettePicker } from "@/src/components/ColorPalettePicker";
import { IconPicker } from "@/src/components/IconPicker";
import { MapPreview } from "@/src/components/MapPreview";
import { RadiusSlider } from "@/src/components/RadiusSlider";
import { SoundPicker } from "@/src/components/SoundPicker";
import { TriggerPicker } from "@/src/components/TriggerPicker";
import {
  DEFAULT_ZONE_COLOR,
  RADIUS_DEFAULT_METERS,
  isValidCoordinate,
} from "@/src/constants";
import { GeofenceLimitError, useAlarms } from "@/src/hooks/useAlarms";
import { usePalette } from "@/src/hooks/usePalette";
import { useTranslation } from "@/src/i18n";
import { consumeMapPickerResult } from "@/src/services/mapPickerResult";
import { shortPlaceName } from "@/src/services/nominatim";
import {
  DEFAULT_ALARM_ICON,
  DEFAULT_ALARM_SOUND_CONFIG,
  DEFAULT_ALARM_TRIGGER,
  alarmIconOf,
  alarmSoundConfigOf,
  alarmTriggerOf,
  type AlarmIconType,
  type AlarmSoundConfig,
  type AlarmTrigger,
  type GeoAlarm,
} from "@/src/types/alarm";
import { cn } from "@/src/utils/cn";
import { createId } from "@/src/utils/id";

export default function AlarmEditorScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const palette = usePalette();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const isNew = id === "new";

  const { alarms, loading, saveAlarm, removeAlarm } = useAlarms();
  const existing = !isNew ? alarms.find((alarm) => alarm.id === id) : undefined;

  const hydrated = useRef(false);
  const createdAtRef = useRef(Date.now());
  const isActiveRef = useRef(true);

  const [title, setTitle] = useState("");
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [placeName, setPlaceName] = useState("");
  const [radius, setRadius] = useState(RADIUS_DEFAULT_METERS);
  const [color, setColor] = useState(DEFAULT_ZONE_COLOR);
  const [icon, setIcon] = useState<AlarmIconType>(DEFAULT_ALARM_ICON);
  const [soundConfig, setSoundConfig] = useState<AlarmSoundConfig>(
    DEFAULT_ALARM_SOUND_CONFIG,
  );
  const [trigger, setTrigger] = useState<AlarmTrigger>(DEFAULT_ALARM_TRIGGER);
  const [titleError, setTitleError] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (isNew || hydrated.current || !existing) {
      return;
    }
    hydrated.current = true;
    createdAtRef.current = existing.createdAt;
    isActiveRef.current = existing.isActive;
    setTitle(existing.title);
    setLatitude(existing.latitude);
    setLongitude(existing.longitude);
    setRadius(existing.radius);
    setColor(existing.color);
    setIcon(alarmIconOf(existing.icon));
    setSoundConfig(alarmSoundConfigOf(existing.soundConfig));
    setTrigger(alarmTriggerOf(existing.trigger));
  }, [existing, isNew]);

  useFocusEffect(
    useCallback(() => {
      const picked = consumeMapPickerResult();
      if (!picked) {
        return;
      }
      hydrated.current = true;
      setLatitude(picked.latitude);
      setLongitude(picked.longitude);
      setPlaceName(picked.placeName);
      setLocationError(false);
      setTitle((current) =>
        current.trim() ? current : shortPlaceName(picked.placeName),
      );
    }, []),
  );

  const openMapPicker = useCallback(() => {
    const params: Record<string, string> = {
      radius: String(radius),
      color,
      icon,
    };
    if (typeof latitude === "number") {
      params.lat = String(latitude);
    }
    if (typeof longitude === "number") {
      params.lng = String(longitude);
    }
    router.push({
      pathname: "/map-picker",
      params,
    });
  }, [color, icon, latitude, longitude, radius, router]);

  const validate = useCallback(() => {
    const trimmed = title.trim();
    const hasTitle = trimmed.length > 0;
    const hasLocation = isValidCoordinate(latitude, longitude);
    setTitleError(!hasTitle);
    setLocationError(!hasLocation);
    return hasTitle && hasLocation;
  }, [latitude, longitude, title]);

  const handleSave = useCallback(async () => {
    if (!validate() || latitude == null || longitude == null) {
      return;
    }

    const alarm: GeoAlarm = {
      id: isNew ? createId() : (id ?? createId()),
      title: title.trim(),
      latitude,
      longitude,
      radius,
      color,
      icon,
      soundConfig:
        soundConfig.mode === "custom" && !soundConfig.customUri
          ? { ...DEFAULT_ALARM_SOUND_CONFIG }
          : soundConfig,
      trigger,
      isActive: isNew ? true : isActiveRef.current,
      createdAt: isNew ? Date.now() : createdAtRef.current,
      updatedAt: Date.now(),
    };

    setSaving(true);
    try {
      await saveAlarm(alarm);
      router.replace("/");
    } catch (caught) {
      if (caught instanceof GeofenceLimitError) {
        Alert.alert(t("geofenceLimit.title"), t("geofenceLimit.body"));
      } else {
        Alert.alert(t("errors.saveFailed"));
      }
    } finally {
      setSaving(false);
    }
  }, [color, icon, id, isNew, latitude, longitude, radius, router, saveAlarm, soundConfig, t, title, trigger, validate]);

  const handleDelete = useCallback(() => {
    if (isNew || !id) {
      return;
    }
    Alert.alert(
      t("alarm.deleteConfirmTitle"),
      t("alarm.deleteConfirmMessage", { title: title.trim() || t("nav.editAlarm") }),
      [
        { text: t("buttons.cancel"), style: "cancel" },
        {
          text: t("buttons.delete"),
          style: "destructive",
          onPress: () => {
            void (async () => {
              await removeAlarm(id);
              router.replace("/");
            })();
          },
        },
      ],
    );
  }, [id, isNew, removeAlarm, router, t, title]);

  if (!isNew && loading && !existing) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <Stack.Screen options={{ title: t("nav.editAlarm") }} />
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (!isNew && !loading && !existing) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-space-6">
        <Stack.Screen options={{ title: t("nav.editAlarm") }} />
        <Text className="typo-title text-center">{t("errors.alarmNotFound")}</Text>
        <Button className="mt-space-6" variant="secondary" onPress={() => router.replace("/")}>
          {t("buttons.back")}
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-canvas"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{ title: isNew ? t("nav.newAlarm") : t("nav.editAlarm") }}
      />
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-space-4 pb-space-8 pt-space-3"
      >
        <View className="gap-space-5">
          <View>
            <Text className="typo-caption mb-space-2">{t("screens.alarm.nameLabel")}</Text>
            <View
              className={cn(
                "min-h-touch flex-row items-center rounded-control border bg-card px-space-3",
                titleError
                  ? "border-danger"
                  : focused
                    ? "border-primary"
                    : "border-border",
              )}
            >
              <TextInput
                value={title}
                onChangeText={(next) => {
                  setTitle(next);
                  if (next.trim()) {
                    setTitleError(false);
                  }
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={t("screens.alarm.namePlaceholder")}
                placeholderTextColor={palette.muted}
                className="typo-body flex-1 py-space-2 text-foreground"
              />
            </View>
            {titleError ? (
              <Text className="typo-caption mt-space-1 text-danger">
                {t("errors.titleRequired")}
              </Text>
            ) : null}
          </View>

          <View>
            <Text className="typo-caption mb-space-2">
              {t("screens.alarm.locationLabel")}
            </Text>
            <View
              className={cn(
                "overflow-hidden rounded-card border bg-card",
                locationError ? "border-danger" : "border-border",
              )}
            >
              <MapPreview
                latitude={latitude}
                longitude={longitude}
                radius={radius}
                color={color}
                icon={icon}
                flush
              />
              {placeName ? (
                <Text
                  className="typo-caption px-space-3 pt-space-2"
                  numberOfLines={2}
                >
                  {placeName}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={openMapPicker}
                className="min-h-touch items-center justify-center px-space-4 py-space-3 active:bg-canvas"
              >
                <Text className="typo-button text-primary">
                  {t("screens.alarm.selectOnMap")}
                </Text>
              </Pressable>
            </View>
            {locationError ? (
              <Text className="typo-caption mt-space-1 text-danger">
                {t("errors.locationRequired")}
              </Text>
            ) : null}
          </View>

          <RadiusSlider value={radius} onChange={setRadius} />

          <View>
            <Text className="typo-caption mb-space-2">{t("screens.alarm.colorLabel")}</Text>
            <ColorPalettePicker value={color} onChange={setColor} />
          </View>

          <View>
            <Text className="typo-caption mb-space-2">{t("screens.alarm.iconLabel")}</Text>
            <IconPicker value={icon} onChange={setIcon} color={color} />
          </View>

          <View>
            <Text className="typo-caption mb-space-2">{t("screens.alarm.soundLabel")}</Text>
            <SoundPicker value={soundConfig} onChange={setSoundConfig} />
          </View>

          <View>
            <Text className="typo-caption mb-space-2">{t("screens.alarm.triggerLabel")}</Text>
            <TriggerPicker value={trigger} onChange={setTrigger} />
          </View>

          <Button
            disabled={saving}
            onPress={() => {
              void handleSave();
            }}
          >
            {isNew ? t("buttons.saveAndActivate") : t("buttons.saveChanges")}
          </Button>

          {!isNew ? (
            <Button variant="danger" onPress={handleDelete}>
              {t("buttons.deleteAlarm")}
            </Button>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
