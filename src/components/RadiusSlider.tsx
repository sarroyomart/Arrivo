import { useMemo, useRef } from "react";
import { PanResponder, Pressable, Text, View, type LayoutChangeEvent } from "react-native";

import {
  RADIUS_MAX_METERS,
  RADIUS_MIN_METERS,
  RADIUS_PRESETS_METERS,
  isRadiusPreset,
  snapRadius,
} from "@/src/constants";
import { useTranslation } from "@/src/i18n";
import { cn } from "@/src/utils/cn";
import { formatRadius } from "@/src/utils/formatRadius";

export type RadiusSliderProps = {
  value: number;
  onChange: (meters: number) => void;
  className?: string;
};

const PRESET_LABEL_KEYS = [
  "radius.chip100",
  "radius.chip500",
  "radius.chip1km",
] as const;

function ratioFromPageX(pageX: number, trackPageX: number, trackWidth: number): number {
  return Math.min(1, Math.max(0, (pageX - trackPageX) / trackWidth));
}

export function RadiusSlider({ value, onChange, className }: RadiusSliderProps) {
  const { t, locale } = useTranslation();
  const trackRef = useRef<View>(null);
  const trackWidth = useRef(1);
  const trackPageX = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const ratio = useMemo(() => {
    const span = RADIUS_MAX_METERS - RADIUS_MIN_METERS;
    return Math.min(1, Math.max(0, (value - RADIUS_MIN_METERS) / span));
  }, [value]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const nextRatio = ratioFromPageX(
          event.nativeEvent.pageX,
          trackPageX.current,
          trackWidth.current,
        );
        onChangeRef.current(
          snapRadius(
            RADIUS_MIN_METERS + nextRatio * (RADIUS_MAX_METERS - RADIUS_MIN_METERS),
          ),
        );
      },
      onPanResponderMove: (event) => {
        const nextRatio = ratioFromPageX(
          event.nativeEvent.pageX,
          trackPageX.current,
          trackWidth.current,
        );
        onChangeRef.current(
          snapRadius(
            RADIUS_MIN_METERS + nextRatio * (RADIUS_MAX_METERS - RADIUS_MIN_METERS),
          ),
        );
      },
    }),
  ).current;

  const onTrackLayout = (event: LayoutChangeEvent) => {
    trackWidth.current = Math.max(event.nativeEvent.layout.width, 1);
    trackRef.current?.measure((_x, _y, _width, _height, pageX) => {
      trackPageX.current = pageX;
    });
  };

  const formatted = formatRadius(value, t, locale);
  const customSelected = !isRadiusPreset(value);

  return (
    <View className={cn("gap-space-3", className)}>
      <Text className="typo-h2">
        {t("screens.alarm.radiusValue", { value: formatted })}
      </Text>

      <View
        ref={trackRef}
        className="min-h-touch justify-center"
        onLayout={onTrackLayout}
        {...panResponder.panHandlers}
      >
        <View className="h-1 overflow-hidden rounded-pill bg-border">
          <View
            className="h-full rounded-pill bg-primary"
            style={{ width: `${ratio * 100}%` }}
          />
        </View>
        <View
          pointerEvents="none"
          className="absolute h-5 w-5 rounded-pill border-2 border-card bg-primary shadow-map"
          style={{ left: `${ratio * 100}%`, marginLeft: -10 }}
        />
      </View>

      <View className="flex-row flex-wrap gap-space-2">
        {RADIUS_PRESETS_METERS.map((meters, index) => {
          const selected = value === meters;
          return (
            <Pressable
              key={meters}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(meters)}
              className={cn(
                "min-h-touch items-center justify-center rounded-control px-space-3",
                selected
                  ? "bg-primary-container"
                  : "border border-border bg-card",
              )}
            >
              <Text
                className={cn(
                  "typo-caption",
                  selected
                    ? "font-sans-medium text-on-primary-container"
                    : "text-muted",
                )}
              >
                {t(PRESET_LABEL_KEYS[index])}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: customSelected }}
          onPress={() => {
            if (!customSelected) {
              onChange(snapRadius(value));
            }
          }}
          className={cn(
            "min-h-touch items-center justify-center rounded-control px-space-3",
            customSelected
              ? "bg-primary-container"
              : "border border-border bg-card",
          )}
        >
          <Text
            className={cn(
              "typo-caption",
              customSelected ? "font-sans-medium text-primary" : "text-muted",
            )}
          >
            {t("radius.custom")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
