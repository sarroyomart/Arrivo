import { NativeModule, requireNativeModule } from "expo";

import type { SystemSoundItem } from "./SystemSounds.types";

declare class SystemSoundsModule extends NativeModule<Record<string, never>> {
  listSounds(kind: string): Promise<SystemSoundItem[]>;
  listPicks(limit: number): Promise<SystemSoundItem[]>;
  play(uri: string, loop: boolean): Promise<void>;
  playResource(name: string, loop: boolean): Promise<void>;
  stop(): Promise<void>;
  presentAlarmNotification(
    identifier: string,
    title: string,
    body: string,
    alarmId: string,
    channelId: string,
    launchUrl: string,
    silent: boolean,
  ): Promise<void>;
  dismissAlarmNotification(identifier: string): Promise<void>;
  acquireWakeLock(): Promise<void>;
  releaseWakeLock(): Promise<void>;
  canUseFullScreenIntent(): Promise<boolean>;
  openFullScreenIntentSettings(): Promise<void>;
}

export default requireNativeModule<SystemSoundsModule>("SystemSounds");
