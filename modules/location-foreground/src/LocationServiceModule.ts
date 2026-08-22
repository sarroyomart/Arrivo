import { NativeModule, requireNativeModule } from "expo";

import type { GeofenceTriggeredEvent } from "./LocationService.types";

type LocationServiceEvents = {
  onGeofenceTriggered: (event: GeofenceTriggeredEvent) => void;
};

declare class LocationServiceModule extends NativeModule<LocationServiceEvents> {
  startBackgroundTracking(
    alarmsJson: string,
    ongoingTitle: string,
    ongoingBody: string,
    copyJson: string,
  ): Promise<void>;
  stopBackgroundTracking(): Promise<void>;
  updateActiveAlarms(alarmsJson: string): Promise<void>;
  drainPendingRingingAlarmId(): Promise<string | null>;
  isTracking(): Promise<boolean>;
}

let cached: LocationServiceModule | null | undefined;

export function getLocationServiceModule(): LocationServiceModule | null {
  if (cached !== undefined) {
    return cached;
  }
  try {
    cached = requireNativeModule<LocationServiceModule>("LocationService");
  } catch {
    cached = null;
  }
  return cached;
}

export default getLocationServiceModule;
