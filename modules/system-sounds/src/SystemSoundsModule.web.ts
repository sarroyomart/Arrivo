import { NativeModule, registerWebModule } from "expo";

import type { SystemSoundItem } from "./SystemSounds.types";

class SystemSoundsModule extends NativeModule<Record<string, never>> {
  async listSounds(_kind: string): Promise<SystemSoundItem[]> {
    return [];
  }

  async listPicks(_limit: number): Promise<SystemSoundItem[]> {
    return [];
  }

  async play(_uri: string, _loop: boolean): Promise<void> {}

  async playResource(_name: string, _loop: boolean): Promise<void> {}

  async stop(): Promise<void> {}

  async presentAlarmNotification(
    _identifier: string,
    _title: string,
    _body: string,
    _alarmId: string,
    _channelId: string,
    _launchUrl: string,
    _silent: boolean,
  ): Promise<void> {}

  async dismissAlarmNotification(_identifier: string): Promise<void> {}

  async acquireWakeLock(): Promise<void> {}

  async releaseWakeLock(): Promise<void> {}

  async canUseFullScreenIntent(): Promise<boolean> {
    return false;
  }

  async openFullScreenIntentSettings(): Promise<void> {}
}

export default registerWebModule(SystemSoundsModule, "SystemSoundsModule");
