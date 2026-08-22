import { NativeModule, registerWebModule } from "expo";

import type { GeofenceTriggeredEvent } from "./LocationService.types";

type LocationServiceEvents = {
  onGeofenceTriggered: (event: GeofenceTriggeredEvent) => void;
};

class LocationServiceModule extends NativeModule<LocationServiceEvents> {
  async startBackgroundTracking(
    _alarmsJson: string,
    _ongoingTitle: string,
    _ongoingBody: string,
    _copyJson: string,
  ): Promise<void> {}

  async stopBackgroundTracking(): Promise<void> {}

  async updateActiveAlarms(_alarmsJson: string): Promise<void> {}

  async drainPendingRingingAlarmId(): Promise<string | null> {
    return null;
  }

  async isTracking(): Promise<boolean> {
    return false;
  }
}

const webModule = registerWebModule(LocationServiceModule, "LocationServiceModule");

export function getLocationServiceModule() {
  return webModule;
}

export default getLocationServiceModule;
