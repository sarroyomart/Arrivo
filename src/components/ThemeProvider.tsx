import { useEffect, useMemo, type PropsWithChildren } from "react";
import { View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";
import { StatusBar } from "expo-status-bar";
import { useMaterial3Theme } from "@pchmn/expo-material3-theme";

import {
  FALLBACK_PRIMARY,
  colors,
  hexToRgba,
  mixHex,
  withSystemAccent,
} from "@/src/constants/palette";
import { PaletteProvider } from "@/src/hooks/usePalette";

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useSystemColorScheme();
  const scheme = systemScheme === "dark" ? "dark" : "light";
  const { theme } = useMaterial3Theme({
    fallbackSourceColor: FALLBACK_PRIMARY,
  });
  const accent = theme[scheme];

  const palette = useMemo(
    () =>
      withSystemAccent({ ...colors[scheme] }, accent),
    [accent, scheme],
  );

  const accentVars = useMemo(
    () =>
      vars({
        "--color-primary": palette.primary,
        "--color-on-primary": palette.onPrimary,
        "--color-primary-container": palette.primaryContainer,
        "--color-on-primary-container": palette.onPrimaryContainer,
        "--color-primary-hover":
          scheme === "dark"
            ? mixHex(palette.primary, "#FFFFFF", 0.18)
            : mixHex(palette.primary, "#000000", 0.14),
        "--color-primary-focus":
          scheme === "dark"
            ? mixHex(palette.primary, "#000000", 0.22)
            : mixHex(palette.primary, "#FFFFFF", 0.35),
        "--color-geofence-fill": hexToRgba(palette.primary, 0.15),
        "--color-geofence-stroke": palette.primary,
      }),
    [palette, scheme],
  );

  useEffect(() => {
    nativewindColorScheme.set(scheme);
  }, [scheme]);

  return (
    <PaletteProvider value={palette}>
      <View
        className={`flex-1 bg-canvas ${scheme === "dark" ? "dark" : ""}`}
        style={accentVars}
      >
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        {children}
      </View>
    </PaletteProvider>
  );
}
