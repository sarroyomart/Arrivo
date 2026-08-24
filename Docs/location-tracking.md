# Location tracking — Arrivo

How Arrivo decides when to read GPS, why the cadence is split into bands, and what that means for battery, car tests, and Play Store review.

This is the behaviour shipped in **1.0.1**. The Play declarations in [`play-console.md`](play-console.md) and the privacy text in [`privacy-policy.md`](privacy-policy.md) stay valid: trip GPS is still processed on the device, still behind “While using the app” plus a visible Android foreground service, and still not uploaded to a first-party server.

---

## Does this affect Play Store / App Store submission?

**No new permissions, no Data Safety change, no new prominent disclosure.**

| Topic | Unchanged |
|---|---|
| Android permissions | `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `FOREGROUND_SERVICE_LOCATION`. Still **no** `ACCESS_BACKGROUND_LOCATION`. |
| When location is used | Foreground / “While using the app”. The persistent **Arrivo active** notification covers the FGS. |
| Data Safety | Trip GPS is not collected or shared. Nominatim / OpenFreeMap only when the user searches or views the map. |
| FGS types | `location` (watch alarms) + `mediaPlayback` (ringing audio). |
| Privacy policy | Same purposes. Cadence is an on-device implementation detail. |
| iOS | Still system geofences (`CLCircularRegion` via Expo). No native polling service. |

What *does* change for a store build: **version** `1.0.1` / Android `versionCode` **2**, and you must ship a **new native binary** (Kotlin). A JS-only OTA cannot update the Android service.

Re-record the FGS demo video only if the persistent notification copy changed. It did not; sampling is internal.

---

## Architecture (who reads GPS)

```
App in the foreground (Android)
  └─ proximityMonitor.ts          High accuracy, 2 s / 8 m
  └─ ActiveAlarmsMap.tsx          High accuracy, 1 s / 5 m  (map puck + distance label)
  └─ native FGS paused

App in the background / screen off (Android, ≥1 active alarm)
  └─ LocationForegroundService    adaptive bands below
  └─ JS watch stopped (the runtime may freeze)

iOS (any state)
  └─ OS geofences only            the system, not Arrivo, chooses when to wake the app
```

Android never uses `startLocationUpdatesAsync` / `ACCESS_BACKGROUND_LOCATION`. If the user force-stops the app or turns every alarm off, the service stops.

---

## Android background bands

The service always requests **`PRIORITY_HIGH_ACCURACY`** (GPS, not cell/Wi‑Fi only). Play Services may still delay a fix; `setMaxUpdateDelayMillis` is set to the same value as the interval so updates are not batched for minutes.

Distance used for the band is **remaining metres to the nearest armed alarm** (straight line, minus radius). Speed can shrink that number (see below).

| Band | Remaining (effective) | Interval | Fastest | Min displacement |
|---|---|---|---|---|
| Far | ≥ 5 km | **12 s** | 6 s | 50 m |
| Mid | 1.2–5 km | **6 s** | 3 s | 25 m |
| Near | 300 m–1.2 km | **3 s** | 1 s | 10 m |
| Close | &lt; 300 m | **1 s** | 0.5 s | 5 m |

Hysteresis avoids flapping at the boundaries (e.g. far→mid only below 4 km effective; close→near only above 350 m).

**Slowest update: 12 s, and only when far.**  
**Fastest: 1 s (0.5 s floor), when close.**

### Why bands exist

A 1 Hz GPS fix for a whole trip would be simpler in a car test and worse for battery if an alarm stays on for hours. Far from the destination, a 50–100 m error does not matter. Inside a 200 m radius at 80 km/h it does: you cover ~22 m per second.

CPU cost of each fix is negligible (distance + maybe a notification). The cost is the GNSS radio and the existing partial wake lock (capped at 12 h).

Compared with **Waze / Google Maps navigation**: those keep ~1 Hz GPS *and* a lit screen, map tiles, traffic, and rerouting for the whole route. Arrivo with the screen off is still much lighter. With Arrivo’s map open, GPS cadence is similar to a navigation app; there is still no routing stack.

---

## How speed is measured (car)

There is no speedometer API. On every fix:

1. Use `Location.getSpeed()` when Android provides it (typical for GPS).
2. Otherwise: distance between this fix and the previous one ÷ elapsed time (ignore gaps &lt; 0.8 s).
3. First fix: speed = 0, so only real remaining distance is used.

Speed does **not** pick a different table. It **shrinks remaining distance** so you enter a faster band sooner:

| Ground speed | Remaining treated as |
|---|---|
| &lt; ~30 km/h (8 m/s) | as-is |
| ≥ ~30 km/h | ÷ 2.5 |
| ≥ ~72 km/h (20 m/s) | ÷ 4 |

Approximate **real** remaining distance in a car (first assignment; hysteresis ± a bit):

| | City (~50 km/h) | Highway (~90 km/h) |
|---|---|---|
| Mid (6 s) from | ~3 km | ~5 km |
| Near (3 s) from | ~750 m | ~1.2 km |
| Close (1 s) from | ~550–750 m | ~900 m |

Example: 90 km/h, 4 km from the pin → already **mid / 6 s**, not 12 s.

Foreground JS watches do **not** use speed; they stay on High accuracy at 1–2 s while the UI is open.

---

## Persistent notification

The ongoing “Arrivo active” notification is **not** updated on every GPS fix. Remaining distance must change by **max(25 m, 10 % of remaining)** (or alarm / inside-outside change). At 8 km that is ~800 m of travel before the text changes, even if GPS is already at 6 s. The map puck is a better signal when the app is open.

---

## Battery (order of magnitude)

| Situation | Expectation |
|---|---|
| 20–40 min drive, screen off, 1.0.1 sampling | Modest extra GNSS vs 1.0.0; far below Maps/Waze with the display on |
| Alarm left armed for hours while parked | Higher than 1.0.0 (12 s High vs 40 s Balanced). Biggest residual drain. |
| Map open | Similar to any High-accuracy blue-dot map |

1.0.0 used `PRIORITY_BALANCED_POWER_ACCURACY` until 1.2 km (often no GPS in a car) and 40 s when far. That is why road tests looked frozen.

---

## What to rebuild

| Change | Needs |
|---|---|
| `LocationForegroundService.kt` bands / speed | Native Android rebuild (`expo run:android` / `assembleRelease` / EAS) |
| `proximityMonitor.ts`, `ActiveAlarmsMap.tsx` | JS bundle (dev reload is enough for an open map) |

Sideload APK: `android/app/build/outputs/apk/release/app-release.apk` after `npx expo prebuild --platform android` and `./gradlew assembleRelease` (debug keystore unless a Play upload key is configured).

Play upload remains an **AAB** from `eas build --profile production --platform android`. Bump `versionCode` for each Play artifact (`1.0.1` is `2`).

---

## Code map

| Piece | Path |
|---|---|
| Adaptive GPS + speed | `modules/location-foreground/android/.../LocationForegroundService.kt` (`samplingFor`, `speedMetersPerSecond`) |
| Arm / pause FGS | `src/services/locationForeground.ts` |
| Foreground enter/exit watch | `src/services/proximityMonitor.ts` |
| Map puck | `src/components/ActiveAlarmsMap.tsx` |
| iOS geofences | `src/services/geofencing.ts` + `src/tasks/geofencingTask.ts` |
| Play copy | `Docs/play-console.md` |
