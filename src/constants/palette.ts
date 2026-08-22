import type { ZoneColorId } from "@/src/types/alarm";

/**
 * Raw hex for native APIs (maps, headers, StatusBar) that cannot use className.
 * Neutrals match `design/tokens.json`. Primary tokens are the orange seed used
 * when the OS has no accent (iOS, Android < 12). Android 12+ overrides them
 * with Material You in `ThemeProvider`.
 */
export const FALLBACK_PRIMARY = "#EA580C";
export const FALLBACK_ON_PRIMARY = "#FFFFFF";
export const FALLBACK_PRIMARY_CONTAINER = "#FFDCC2";
export const FALLBACK_ON_PRIMARY_CONTAINER = "#2E1500";

export const colors = {
  light: {
    primary: FALLBACK_PRIMARY,
    onPrimary: FALLBACK_ON_PRIMARY,
    primaryContainer: FALLBACK_PRIMARY_CONTAINER,
    onPrimaryContainer: FALLBACK_ON_PRIMARY_CONTAINER,
    canvas: "#FAFAFA",
    card: "#FFFFFF",
    map: "#F1F5F9",
    foreground: "#09090B",
    muted: "#71717A",
    border: "#E4E4E7",
    danger: "#DC2626",
    success: "#16A34A",
  },
  dark: {
    primary: FALLBACK_PRIMARY,
    onPrimary: FALLBACK_ON_PRIMARY,
    primaryContainer: "#7C2D12",
    onPrimaryContainer: FALLBACK_PRIMARY_CONTAINER,
    canvas: "#09090B",
    card: "#18181B",
    map: "#1E293B",
    foreground: "#FAFAFA",
    muted: "#A1A1AA",
    border: "#27272A",
    danger: "#F87171",
    success: "#22C55E",
  },
} as const;

export type AppPalette = {
  -readonly [K in keyof (typeof colors)["light"]]: string;
};

export type SystemAccent = {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
};

function parseRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized.slice(0, 6);
  const int = Number.parseInt(value, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function mixHex(hex: string, withHex: string, amount: number): string {
  const from = parseRgb(hex);
  const to = parseRgb(withHex);
  return toHex(
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount,
  );
}

export function withSystemAccent(
  base: AppPalette,
  accent: SystemAccent,
): AppPalette {
  return {
    ...base,
    primary: accent.primary,
    onPrimary: accent.onPrimary,
    primaryContainer: accent.primaryContainer,
    onPrimaryContainer: accent.onPrimaryContainer,
  };
}

export const ZONE_PALETTE: readonly { id: ZoneColorId; hex: string }[] = [
  { id: "orange", hex: "#EA580C" },
  { id: "teal", hex: "#14B8A6" },
  { id: "blue", hex: "#3B82F6" },
  { id: "violet", hex: "#8B5CF6" },
  { id: "rose", hex: "#F43F5E" },
  { id: "slate", hex: "#64748B" },
] as const;

export const DEFAULT_ZONE_COLOR = ZONE_PALETTE[0].hex;

const ZONE_BG_CLASS: Record<ZoneColorId, string> = {
  orange: "bg-zone-orange",
  teal: "bg-zone-teal",
  blue: "bg-zone-blue",
  violet: "bg-zone-violet",
  rose: "bg-zone-rose",
  slate: "bg-zone-slate",
};

/** NativeWind fill class for a stored zone hex. Falls back to the default swatch. */
export function zoneBgClass(hex: string): string {
  const match = ZONE_PALETTE.find(
    (swatch) => swatch.hex.toLowerCase() === hex.toLowerCase(),
  );
  return ZONE_BG_CLASS[match?.id ?? "orange"];
}

export const GEOFENCE_FILL_OPACITY = 0.15;

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = parseRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
