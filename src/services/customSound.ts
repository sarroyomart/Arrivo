import * as FileSystem from "expo-file-system/legacy";

import { createId } from "@/src/utils/id";

const CUSTOM_SOUND_DIR = "alarm-sounds";
const ALLOWED_EXTENSIONS = [".mp3", ".wav", ".m4a"] as const;

const MIME_TO_EXT: Record<string, string> = {
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/wave": ".wav",
  "audio/mp4": ".m4a",
  "audio/m4a": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".m4a",
};

function customSoundExtensionOf(name: string, mimeType?: string): string | null {
  const match = /\.[^.]+$/.exec(name.trim().toLowerCase());
  if (match && (ALLOWED_EXTENSIONS as readonly string[]).includes(match[0])) {
    return match[0];
  }
  if (mimeType && MIME_TO_EXT[mimeType.toLowerCase()]) {
    return MIME_TO_EXT[mimeType.toLowerCase()];
  }
  return null;
}

export function isAllowedCustomSound(name: string, mimeType?: string): boolean {
  return customSoundExtensionOf(name, mimeType) !== null;
}

function sanitizeFileName(name: string): string {
  const trimmed = name.trim() || "audio";
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

export async function persistCustomSound(
  sourceUri: string,
  originalName: string,
  mimeType?: string,
): Promise<{ uri: string; name: string }> {
  const root = FileSystem.documentDirectory;
  const ext = customSoundExtensionOf(originalName, mimeType) ?? ".m4a";
  const displayName = sanitizeFileName(originalName) || `audio${ext}`;

  if (!root) {
    return { uri: sourceUri, name: displayName };
  }

  const dir = `${root}${CUSTOM_SOUND_DIR}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  const destination = `${dir}${createId()}${ext}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  return { uri: destination, name: displayName };
}
