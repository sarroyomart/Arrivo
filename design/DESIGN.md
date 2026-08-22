# Diseño Arrivo

Fuente de verdad: archivo Penpot **New File 1** (páginas `01-Tokens`, `02-Componentes`, `03-Paginas`). Acento naranja alineado a **Material You (Material Design 3)** `md.sys.color.*`.

Stack: **Expo + NativeWind** (iOS/Android RN) y, en Android nativo opcional, **Jetpack Compose** `dynamicColorScheme`.

Exportaciones: `design/tokens.json`, `design/screens/dashboard.{svg,png}`, `design/screens/configurar-alarma.{svg,png}`, `design/screens/main-tab-map-{light,dark}.svg`, `design/screens/main-tab-list-{light,dark}.svg`, `design/components/segmented-tabs.svg`, `design/components/tab-item.svg`.

---

## Color de acento — Material You (`md.sys.color`)

Set Penpot `md-sys`. Los hex son **fallbacks estáticos** (naranja seed `#EA580C`) cuando no hay color dinámico del wallpaper.

| Token MD3 | Rol | Fallback | Uso en Arrivo |
|-----------|-----|----------|-----------------|
| `md.sys.color.primary` | Color de marca | `#EA580C` | Botón primary, switch on, pin, stroke geocerca, progreso del slider |
| `md.sys.color.on-primary` | Contenido sobre primary | `#FFFFFF` | Texto/icono de `+ Nueva Alarma` y `Guardar y Activar` |
| `md.sys.color.primary-container` | Superficie de acento suave | `#FFDCC2` | Badges `Al entrar`, chip `Personalizado`, avatar |
| `md.sys.color.on-primary-container` | Contenido sobre container | `#2E1500` | Texto de esos badges/chips |
| `md.sys.color.primary` @ **15%** | Overlay | `#EA580C26` | Fill del círculo de geocerca (`color.geofence-fill`) |

Aliases de compatibilidad (set `color`): `color.primary` → `{md.sys.color.primary}`, `color.primary-soft` → `{md.sys.color.primary-container}`, `color.geofence-stroke` → `{md.sys.color.primary}`.

### Consumo estático (Expo / NativeWind / iOS)

Siempre el fallback. No hay wallpaper scheme en iOS equivalente a Material You.

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: { DEFAULT: "#EA580C", container: "#FFDCC2" },
      "on-primary": { DEFAULT: "#FFFFFF", container: "#2E1500" },
    },
  },
}
```

```tsx
<Pressable className="bg-primary">
  <Text className="text-on-primary">+ Nueva Alarma</Text>
</Pressable>
<View className="bg-primary-container">
  <Text className="text-on-primary-container">Al entrar</Text>
</View>
```

## Paleta del área de acción (geocerca)

Cada alarma elige un color de zona (`GeoAlarm.color`). El componente es el **círculo de radio** con un **map marker** (pin gota) en el centro. Fill = color @ 15%, stroke = color 100%.

| Token | Hex | UI |
|-------|-----|-----|
| `color.zone-orange` | `#EA580C` | Default (primary) |
| `color.zone-teal` | `#14B8A6` | |
| `color.zone-blue` | `#3B82F6` | |
| `color.zone-violet` | `#8B5CF6` | |
| `color.zone-rose` | `#F43F5E` | |
| `color.zone-slate` | `#64748B` | |

Componente `ColorSwatch`: seleccionado = anillo `color.foreground` + punto 24; no seleccionado = punto 28. En **02-Componentes** (fila) y **03-Paginas** (Configurar Alarma). Dashboard muestra dos geocercas (naranja y teal) con el pin centrado.

```tsx
<GeofenceLayer
  latitude={alarm.latitude}
  longitude={alarm.longitude}
  radius={alarm.radius}
  color={alarm.color}
/>
<Marker lngLat={[alarm.longitude, alarm.latitude]} />
```

### Consumo dinámico (Android Material You)

En **Jetpack Compose**, `dynamicColorScheme()` deriva `ColorScheme.primary` / `onPrimary` / `primaryContainer` / `onPrimaryContainer` del wallpaper (API 31+). El seed de diseño es naranja; en runtime el primary **puede no ser naranja**.

```kotlin
val scheme = if (Build.VERSION.SDK_INT >= 31) {
  dynamicColorScheme(context, darkTheme)
} else {
  // Fallback estático = tokens Penpot
  lightColorScheme(
    primary = Color(0xFFEA580C),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFFFDCC2),
    onPrimaryContainer = Color(0xFF2E1500),
  )
}

MaterialTheme(colorScheme = scheme) {
  Button(colors = ButtonDefaults.buttonColors(
    containerColor = MaterialTheme.colorScheme.primary,
    contentColor = MaterialTheme.colorScheme.onPrimary,
  )) { Text("Guardar y Activar") }

  AssistChip(
    colors = AssistChipDefaults.assistChipColors(
      containerColor = MaterialTheme.colorScheme.primaryContainer,
      labelColor = MaterialTheme.colorScheme.onPrimaryContainer,
    ),
    label = { Text("Al entrar") },
    onClick = {},
  )
}
```

Geocerca en Compose/Maps: `scheme.primary.copy(alpha = 0.15f)` fill, `scheme.primary` stroke.

**Expo (Android):** no hay `dynamicColorScheme` de Compose. Opciones:

1. Estático (recomendado MVP): mismos hex que Penpot.
2. Puente nativo: leer `DynamicColors` / `WallpaperColors` y exponer `primary`, `onPrimary`, `primaryContainer`, `onPrimaryContainer` a JS; NativeWind via CSS variables o `theme` runtime.

Contrato único: los componentes **nunca** usan `#EA580C` a pelo; piden `md.sys.color.primary` (o el alias `color.primary`). En Android dinámico ese token cambia; en iOS y fallback es `#EA580C`.

---

## Resto de tokens (no MD3)

| Token | Hex | Uso |
|-------|-----|-----|
| `color.alarm-active` / `-soft` | `#16A34A` / `#DCFCE7` | En rango |
| `color.alarm-inactive` / `-soft` | `#71717A` / `#F4F4F5` | Fuera / off |
| `color.danger` / `-soft` | `#DC2626` / `#FEE2E2` | Desactivar alarma |
| `color.canvas` | `#FAFAFA` | Fondo app |
| `color.card` | `#FFFFFF` | Tarjetas / sheet |
| `color.map` | `#F1F5F9` | Contenedor mapa |
| `color.foreground` | `#09090B` | Texto |
| `color.muted` | `#71717A` | Secundario |
| `color.border` | `#E4E4E7` | Bordes |

Tipo Inter: display 28/700 · h2 16/600 · body 14/400–500 · caption 12/400.

Espacio 4–32 · radii card 12 / control 8 / pill · sombra mapa `0 4px 12px 0 #00000014`.

---

## Fase 2 — Componentes

| Componente | Tokens de acento |
|------------|------------------|
| `Button` Primary | fill `primary`, texto `on-primary` |
| `Switch` On | track `primary` |
| `Badge` / chip activo | fill `primary-container`, texto `on-primary-container` |
| `ColorSwatch` | paleta `color.zone-*`; seleccionado con anillo |
| `IconPicker` | 8 iconos minimalistas en círculo del color de zona; seleccionado con anillo `color.foreground` |
| `MapPreview` / geocerca | fill zona@15%, stroke zona, **marker con icono de alarma centrado** |
| `SoundPicker` | filas `primary-container` / `on-primary-container`; play de preescucha |
| `RadiusSlider` | progreso `primary` |
| `AlarmHUD` kicker | texto `on-primary-container` o `primary` |
| `TabItem` | Active: fill `md.sys.color.primary`, texto `on-primary`; Inactive: texto `color.muted`. Auto-layout, `radius-pill`, toque mín. 44pt |
| `SegmentedTabs` / TabBar | Track `color.alarm-inactive-soft` + `radius-pill`. Variante `Selected`: Map / Alarms. El tab activo es un `TabItem` Active (naranja); el inactivo, muted |

Código: `src/components/SegmentedTabs.tsx` (`tabs`, `activeTab`, `onTabChange`). i18n: `tabs.map`, `tabs.alarms`.

## Fase 3 — Páginas

`03-Paginas`, 390×844, Light y Dark:

| Frame Penpot | Ruta | Contenido |
|--------------|------|-----------|
| **Main-Tab-Map** | `/` pestaña Mapa | OSM a pantalla completa, punto de usuario (azul/`color.zone-blue`), geocercas **solo activas** (marker + círculo @ 15%), callout inferior (título, distancia, Editar → `/alarm/[id]`), FAB recentrar |
| **Main-Tab-List** | `/` pestaña Alarmas | Lista CRUD (`AlarmCard` activas e inactivas), swipe/borrar, `EmptyState`, FAB `+ Nueva Alarma` → `/alarm/new` |
| Dashboard | (histórico) | Búsqueda + mapa + sheet |
| Configurar Alarma | `/alarm/[id]` | Preview + form + Guardar y Activar |

### Navegación de pestañas (home)

La pantalla de inicio no es solo la lista: un `SegmentedTabs` bajo el AppBar cambia entre vista espacial y gestión.

```tsx
<SegmentedTabs
  tabs={[
    { key: "map", label: t("tabs.map"), icon: "map-outline" },
    { key: "list", label: t("tabs.alarms"), icon: "list-outline" },
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
{activeTab === "map" ? <ActiveAlarmsMap alarms={alarms} /> : <AlarmList />}
```

Sincronización: `useAlarms` es la fuente única. Si se desactiva una alarma en la lista, deja de pintarse en el mapa al volver a Mapa (`alarms.filter(a => a.isActive)`).

Mapa: MapLibre + teselas vectoriales OpenFreeMap (`OsmMap`), sin Google Maps ni API key. Fill de geocerca = color de zona @ 15% (`GEOFENCE_FILL_OPACITY`).

## Sonido de la alarma

Componente `SoundPicker` en **02-Componentes** y en Configurar Alarma. Catálogo cerrado:

| `AlarmSoundType` | Copy ES | Comportamiento |
|------------------|---------|----------------|
| `default` | Alarma estándar | Loop de `assets/sounds/alarm.wav` |
| `gentle` | Tono suave | Campanilla `gentle.wav` |
| `urgent` | Aviso urgente | Sirena `urgent.wav` |
| `vibration_only` | Solo vibración | Sin audio; patrón de vibración |

Preescucha en el editor con `expo-audio` (`previewAlarmSound`). En Android, cada tipo usa su canal de notificación.

```ts
sound: "default" | "gentle" | "urgent" | "vibration_only"
```

El chip de sonido en `AlarmCard` refleja el tipo elegido.

## Icono de la alarma

Catálogo cerrado `AlarmIconType`: `pin`, `home`, `briefcase`, `school`, `train`, `shopping-cart`, `dumbbell`, `coffee`.

- **Lista (`AlarmCard`)**: el icono sustituye el punto genérico, dentro de un círculo del color de zona.
- **Mapa (`ActiveAlarmsMap`, `MapPicker`, `MapPreview`)**: burbuja circular con el icono centrado y el color temático.
- **Editor**: `IconPicker` junto a la paleta de color.
