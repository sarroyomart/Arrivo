import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import type { MapCoordinate } from "@/src/constants";
import { usePalette } from "@/src/hooks/usePalette";
import { useTranslation } from "@/src/i18n";
import {
  searchPlaces,
  type NominatimPlace,
} from "@/src/services/nominatim";
import { cn } from "@/src/utils/cn";

const SEARCH_DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

export type LocationSearchBarProps = {
  onSelectPlace: (place: NominatimPlace) => void;
  /** User GPS — biases Nominatim to nearby streets/portals. Not the map pin. */
  proximity?: MapCoordinate | null;
  className?: string;
};

export function LocationSearchBar({
  onSelectPlace,
  proximity,
  className,
}: LocationSearchBarProps) {
  const { t, locale } = useTranslation();
  const palette = usePalette();
  const requestId = useRef(0);
  const skipSearchRef = useRef(false);

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<NominatimPlace[]>([]);

  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      setLoading(false);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const currentId = requestId.current + 1;
    requestId.current = currentId;

    const timer = setTimeout(() => {
      void searchPlaces(trimmed, {
        language: locale,
        userLat: proximity?.latitude,
        userLon: proximity?.longitude,
      })
        .then((places) => {
          if (requestId.current !== currentId) {
            return;
          }
          setSuggestions(places);
          setLoading(false);
        })
        .catch(() => {
          if (requestId.current !== currentId) {
            return;
          }
          setSuggestions([]);
          setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [locale, proximity?.latitude, proximity?.longitude, query]);

  const showList = focused && (loading || suggestions.length > 0 || query.trim().length >= MIN_QUERY_LENGTH);

  const clear = () => {
    requestId.current += 1;
    setQuery("");
    setSuggestions([]);
    setLoading(false);
  };

  return (
    <View className={cn("z-10", className)}>
      <View
        className={cn(
          "min-h-touch flex-row items-center rounded-control border bg-card px-space-3",
          focused ? "border-primary" : "border-border",
        )}
      >
        <Ionicons name="search" size={18} color={palette.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setTimeout(() => setFocused(false), 150);
          }}
          placeholder={t("screens.mapPicker.searchPlaceholder")}
          placeholderTextColor={palette.muted}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel={t("a11y.searchPlaces")}
          className="typo-body mx-space-2 flex-1 py-space-2 text-foreground"
        />
        {loading ? (
          <ActivityIndicator size="small" color={palette.primary} />
        ) : query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("a11y.clearSearch")}
            hitSlop={8}
            onPress={clear}
            className="h-icon w-icon items-center justify-center"
          >
            <Ionicons name="close-circle" size={18} color={palette.muted} />
          </Pressable>
        ) : null}
      </View>

      {showList ? (
        <View
          pointerEvents="auto"
          className="z-20 mt-space-1 overflow-hidden rounded-control border border-border bg-card shadow-map"
        >
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
            {suggestions.map((place) => (
              <Pressable
                key={`${place.lat}-${place.lon}-${place.label}`}
                accessibilityRole="button"
                onPressIn={() => {
                  skipSearchRef.current = true;
                  onSelectPlace(place);
                  setQuery(place.primaryLabel || place.label);
                }}
                onPress={() => {
                  setSuggestions([]);
                  setFocused(false);
                }}
                className="min-h-touch justify-center border-b border-border px-space-3 py-space-2 last:border-b-0 active:bg-canvas"
              >
                <Text className="typo-body" numberOfLines={1}>
                  {place.primaryLabel || place.label}
                </Text>
                {place.secondaryLabel ? (
                  <Text className="typo-caption mt-space-1" numberOfLines={1}>
                    {place.secondaryLabel}
                  </Text>
                ) : null}
              </Pressable>
            ))}
            {!loading &&
            query.trim().length >= MIN_QUERY_LENGTH &&
            suggestions.length === 0 ? (
              <View className="min-h-touch justify-center px-space-3 py-space-2">
                <Text className="typo-caption">{t("errors.noPlaces")}</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
