/** @type {import('tailwindcss').Config} */
/**
 * NativeWind theme mapped 1:1 from Penpot `design/tokens.json` + `design/DESIGN.md`.
 * Light hex values are the Penpot export. Dark values are MD3-style counterparts
 * of those same semantic tokens (Penpot phase 1 shipped light only).
 *
 * Screens must use these class names (`bg-canvas`, `text-foreground`, `bg-brand`,
 * `dark:bg-canvas-dark`, …). Do not introduce ad-hoc hex in UI code.
 * Zone / map APIs that need a raw hex should import `src/constants/palette.ts`.
 */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Material You seed (md.sys.color.primary) — brand / naranja
        brand: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          focus: "var(--color-primary-focus)",
          container: "var(--color-primary-container)",
        },
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          focus: "var(--color-primary-focus)",
          container: "var(--color-primary-container)",
        },
        "on-primary": {
          DEFAULT: "var(--color-on-primary)",
          container: "var(--color-on-primary-container)",
        },
        // Surfaces
        bg: "var(--color-canvas)",
        canvas: {
          DEFAULT: "var(--color-canvas)",
          dark: "#09090B",
        },
        surface: "var(--color-card)",
        card: {
          DEFAULT: "var(--color-card)",
          dark: "#18181B",
        },
        "surface-elevated": "var(--color-card)",
        map: {
          DEFAULT: "var(--color-map)",
          dark: "#1E293B",
        },
        overlay: "var(--color-overlay)",
        // Text
        text: {
          DEFAULT: "var(--color-foreground)",
          muted: "var(--color-muted)",
        },
        foreground: {
          DEFAULT: "var(--color-foreground)",
          dark: "#FAFAFA",
        },
        muted: {
          DEFAULT: "var(--color-muted)",
          dark: "#A1A1AA",
        },
        // Stroke
        border: {
          DEFAULT: "var(--color-border)",
          dark: "#27272A",
        },
        // Status
        danger: {
          DEFAULT: "var(--color-danger)",
          soft: "var(--color-danger-soft)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          soft: "var(--color-success-soft)",
        },
        alarm: {
          active: "var(--color-success)",
          "active-soft": "var(--color-success-soft)",
          nearby: "var(--color-primary)",
          "nearby-soft": "var(--color-primary-container)",
          inactive: "var(--color-alarm-inactive)",
          "inactive-soft": "var(--color-alarm-inactive-soft)",
        },
        geofence: {
          fill: "var(--color-geofence-fill)",
          stroke: "var(--color-geofence-stroke)",
        },
        // Closed radius / zone palette (6 swatches)
        zone: {
          orange: "#EA580C",
          teal: "#14B8A6",
          blue: "#3B82F6",
          violet: "#8B5CF6",
          rose: "#F43F5E",
          slate: "#64748B",
        },
      },
      fontFamily: {
        sans: ["Inter_400Regular"],
        "sans-medium": ["Inter_500Medium"],
        "sans-semibold": ["Inter_600SemiBold"],
        "sans-bold": ["Inter_700Bold"],
      },
      fontSize: {
        display: ["28px", { lineHeight: "1.25", fontWeight: "700" }],
        title: ["16px", { lineHeight: "1.4", fontWeight: "600" }],
        h2: ["16px", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "1.4", fontWeight: "400" }],
        button: ["14px", { lineHeight: "1.5", fontWeight: "500" }],
      },
      fontWeight: {
        regular: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
      },
      // 4pt grid. Default Tailwind spacing already maps 1 → 4px.
      // Named keys match Penpot `space.*` (4, 8, 12, 16, 20, 24, 32) and plan space-N.
      spacing: {
        "space-1": "4px",
        "space-2": "8px",
        "space-3": "12px",
        "space-4": "16px",
        "space-5": "20px",
        "space-6": "24px",
        "space-8": "32px",
        "space-10": "40px",
        "space-12": "48px",
        "space-16": "64px",
      },
      borderRadius: {
        card: "12px",
        control: "8px",
        pill: "9999px",
      },
      boxShadow: {
        map: "0 4px 12px -2px rgba(0, 0, 0, 0.08)",
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
      width: {
        icon: "24px",
        "icon-sm": "16px",
        "icon-md": "20px",
      },
      height: {
        icon: "24px",
        "icon-sm": "16px",
        "icon-md": "20px",
        touch: "44px",
      },
      opacity: {
        disabled: "0.38",
        overlay: "0.5",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "300ms",
      },
    },
  },
  plugins: [],
};
