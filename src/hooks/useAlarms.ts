import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

import { stopBackgroundTracking } from "@/modules/location-foreground";
import { MAX_ACTIVE_GEOFENCES } from "@/src/constants";
import { syncActiveRegions } from "@/src/services/geofencing";
import { cancelSnoozeNotification } from "@/src/services/notifications";
import {
  deleteAlarm,
  getAlarms,
  toggleAlarmActive,
  upsertAlarm,
} from "@/src/services/storage";
import type { GeoAlarm } from "@/src/types/alarm";

export class GeofenceLimitError extends Error {
  readonly code = "GEOFENCE_LIMIT" as const;

  constructor() {
    super("MAX_ACTIVE_GEOFENCES");
    this.name = "GeofenceLimitError";
  }
}

function activeCountExcluding(alarms: GeoAlarm[], id: string): number {
  return alarms.filter((alarm) => alarm.isActive && alarm.id !== id).length;
}

async function stopTrackingIfNoActiveAlarms(count: number): Promise<void> {
  if (Platform.OS === "android" && count <= 0) {
    try {
      await stopBackgroundTracking();
    } catch (error) {
      console.warn("[Arrivo] Failed to stop location foreground service", error);
    }
  }
}

export function useAlarms() {
  const [alarms, setAlarms] = useState<GeoAlarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshAlarms = useCallback(async () => {
    try {
      setError(null);
      setAlarms(await getAlarms());
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("loadAlarms"));
      setAlarms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAlarms();
  }, [refreshAlarms]);

  const saveAlarm = useCallback(
    async (alarm: GeoAlarm) => {
      if (
        alarm.isActive &&
        activeCountExcluding(alarms, alarm.id) >= MAX_ACTIVE_GEOFENCES
      ) {
        const limitError = new GeofenceLimitError();
        setError(limitError);
        throw limitError;
      }

      try {
        await upsertAlarm(alarm);
        const nextActive = alarm.isActive
          ? activeCountExcluding(alarms, alarm.id) + 1
          : activeCountExcluding(alarms, alarm.id);
        await stopTrackingIfNoActiveAlarms(nextActive);
        await syncActiveRegions();
        await refreshAlarms();
      } catch (caught) {
        const next = caught instanceof Error ? caught : new Error("saveAlarm");
        setError(next);
        throw next;
      }
    },
    [alarms, refreshAlarms],
  );

  const removeAlarm = useCallback(
    async (id: string) => {
      try {
        await deleteAlarm(id);
        await cancelSnoozeNotification(id);
        await stopTrackingIfNoActiveAlarms(activeCountExcluding(alarms, id));
        await syncActiveRegions();
        await refreshAlarms();
      } catch (caught) {
        const next = caught instanceof Error ? caught : new Error("removeAlarm");
        setError(next);
        throw next;
      }
    },
    [alarms, refreshAlarms],
  );

  const toggleAlarm = useCallback(
    async (id: string, isActive: boolean) => {
      if (isActive && activeCountExcluding(alarms, id) >= MAX_ACTIVE_GEOFENCES) {
        const limitError = new GeofenceLimitError();
        setError(limitError);
        throw limitError;
      }

      try {
        await toggleAlarmActive(id, isActive);
        if (!isActive) {
          await cancelSnoozeNotification(id);
        }
        const nextActive = isActive
          ? activeCountExcluding(alarms, id) + 1
          : activeCountExcluding(alarms, id);
        await stopTrackingIfNoActiveAlarms(nextActive);
        await syncActiveRegions();
        await refreshAlarms();
      } catch (caught) {
        const next = caught instanceof Error ? caught : new Error("toggleAlarm");
        setError(next);
        throw next;
      }
    },
    [alarms, refreshAlarms],
  );

  return {
    alarms,
    loading,
    error,
    refreshAlarms,
    saveAlarm,
    removeAlarm,
    toggleAlarm,
  };
}
