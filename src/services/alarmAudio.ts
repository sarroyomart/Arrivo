import { Platform, Vibration } from "react-native";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";

import {
  acquireAlarmWakeLock,
  canUseAndroidSystemSounds,
  listSystemSoundPicks,
  playRawResource,
  playSystemSound,
  releaseAlarmWakeLock,
  stopSystemSound,
} from "@/modules/system-sounds";
import { ALARM_SOUND_ASSETS, ALARM_SOUND_FILES } from "@/src/constants/sounds";
import {
  alarmSoundConfigOf,
  alarmSystemToneOf,
  type AlarmSoundConfig,
} from "@/src/types/alarm";

let player: AudioPlayer | null = null;
let starting: Promise<void> | null = null;
let previewPlayer: AudioPlayer | null = null;
let vibrationTimer: ReturnType<typeof setInterval> | null = null;
let playingSystemSound = false;

const VIBRATION_PATTERN = [0, 500, 250, 500] as const;

function releasePlayer(current: AudioPlayer | null): void {
  if (!current) {
    return;
  }
  try {
    current.pause();
    current.remove();
  } catch {
    try {
      current.remove();
    } catch {
      // Already released.
    }
  }
}

function stopVibration(): void {
  Vibration.cancel();
  if (vibrationTimer) {
    clearInterval(vibrationTimer);
    vibrationTimer = null;
  }
}

function startVibrationLoop(): void {
  stopVibration();
  if (Platform.OS === "android") {
    Vibration.vibrate([...VIBRATION_PATTERN], true);
    return;
  }
  Vibration.vibrate([...VIBRATION_PATTERN]);
  vibrationTimer = setInterval(() => {
    Vibration.vibrate([...VIBRATION_PATTERN]);
  }, 1_500);
}

function bundledSourceOf(config: AlarmSoundConfig): number | { uri: string } {
  if (config.mode === "custom" && config.customUri) {
    return { uri: config.customUri };
  }
  return ALARM_SOUND_ASSETS[alarmSystemToneOf(config.systemTone)];
}

async function resolveAndroidSystemUri(config: AlarmSoundConfig): Promise<string | null> {
  if (config.systemUri) {
    return config.systemUri;
  }
  const sounds = await listSystemSoundPicks(10);
  return sounds.find((item) => item.isDefault)?.uri ?? sounds[0]?.uri ?? null;
}

async function startNativeSystemSound(config: AlarmSoundConfig, loop: boolean): Promise<boolean> {
  if (!canUseAndroidSystemSounds()) {
    return false;
  }
  const uri = await resolveAndroidSystemUri(config);
  if (!uri) {
    return false;
  }
  await playSystemSound(uri, loop);
  playingSystemSound = true;
  return true;
}

async function stopNativeSystemSound(): Promise<void> {
  if (!canUseAndroidSystemSounds()) {
    playingSystemSound = false;
    return;
  }
  playingSystemSound = false;
  try {
    await stopSystemSound();
  } catch {
    // Native module may be missing until the next development build.
  }
  try {
    await releaseAlarmWakeLock();
  } catch {
    // Wake lock may already have been released.
  }
}

export async function prepareAlarmAudioMode(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: "doNotMix",
    allowsRecording: false,
  });
}

async function startBundledNativeSound(
  config: AlarmSoundConfig,
  loop: boolean,
): Promise<boolean> {
  if (!canUseAndroidSystemSounds()) {
    return false;
  }
  const file = ALARM_SOUND_FILES[alarmSystemToneOf(config.systemTone)];
  await playRawResource(file, loop);
  playingSystemSound = true;
  await acquireAlarmWakeLock();
  return true;
}

function releasePreview(): void {
  const current = previewPlayer;
  previewPlayer = null;
  releasePlayer(current);
}

export function stopAlarmPreview(): void {
  releasePreview();
  void stopNativeSystemSound();
}

export async function previewAlarmSound(config: AlarmSoundConfig): Promise<void> {
  const resolved = alarmSoundConfigOf(config);
  releasePreview();
  await stopNativeSystemSound();
  releasePlayer(player);
  player = null;

  if (resolved.mode === "vibration") {
    Vibration.vibrate(400);
    return;
  }

  if (resolved.mode === "system") {
    try {
      if (await startNativeSystemSound(resolved, false)) {
        return;
      }
    } catch {
      // Fall through to the bundled tone on iOS or if the native player fails.
    }
  }

  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: "mixWithOthers",
    allowsRecording: false,
  });

  const next = createAudioPlayer(bundledSourceOf(resolved));
  next.loop = false;
  next.volume = resolved.mode === "system" && resolved.systemTone === "gentle" ? 0.65 : 1;
  next.play();
  previewPlayer = next;
}

export async function startAlarmAudio(config?: AlarmSoundConfig): Promise<void> {
  const resolved = alarmSoundConfigOf(config);
  releasePreview();
  await stopNativeSystemSound();

  if (starting) {
    try {
      await starting;
    } catch {
      // Ignore a failed previous start so we can play the new source.
    }
  }

  if (resolved.mode === "vibration") {
    releasePlayer(player);
    player = null;
    await stopNativeSystemSound();
    startVibrationLoop();
    return;
  }

  starting = (async () => {
    releasePlayer(player);
    player = null;
    stopVibration();
    await stopNativeSystemSound();

    if (resolved.mode === "system") {
      try {
        if (await startNativeSystemSound(resolved, true)) {
          await acquireAlarmWakeLock();
          return;
        }
      } catch {
        // Fall through to the bundled tone.
      }
    }

    if (resolved.mode === "custom" && resolved.customUri && canUseAndroidSystemSounds()) {
      try {
        await playSystemSound(resolved.customUri, true);
        playingSystemSound = true;
        await acquireAlarmWakeLock();
        return;
      } catch {
        // Fall through to expo-audio.
      }
    }

    try {
      if (await startBundledNativeSound(resolved, true)) {
        return;
      }
    } catch {
      // Fall through to expo-audio if the raw resource is not packaged yet.
    }

    await prepareAlarmAudioMode();

    const next = createAudioPlayer(bundledSourceOf(resolved));
    next.loop = true;
    next.volume = resolved.mode === "system" && resolved.systemTone === "gentle" ? 0.7 : 1;
    next.play();
    player = next;
  })();

  try {
    await starting;
  } finally {
    starting = null;
  }
}

export async function stopAlarmAudio(): Promise<void> {
  releasePreview();
  stopVibration();
  await stopNativeSystemSound();
  if (starting) {
    try {
      await starting;
    } catch {
      // Ignore a failed start; we still want to reset the instance.
    }
  }
  const current = player;
  player = null;
  releasePlayer(current);
}
