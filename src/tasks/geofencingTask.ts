import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { GEOFENCE_TASK_NAME } from "@/src/constants";
import { getAlarmById } from "@/src/services/storage";
import { triggerGeoAlarm } from "@/src/services/triggerAlarm";
import { alarmTriggerOf } from "@/src/types/alarm";

type GeofencingTaskData = {
  eventType?: Location.GeofencingEventType;
  region?: Location.LocationRegion;
};

if (!TaskManager.isTaskDefined(GEOFENCE_TASK_NAME)) {
  TaskManager.defineTask<GeofencingTaskData>(
    GEOFENCE_TASK_NAME,
    async ({ data, error }) => {
      if (error) {
        console.warn("[Arrivo] Geofence task error", error.message);
        return;
      }

      const eventType = data?.eventType;
      const isEnter = eventType === Location.GeofencingEventType.Enter;
      const isExit = eventType === Location.GeofencingEventType.Exit;
      if (!isEnter && !isExit) {
        return;
      }

      const alarmId = data.region?.identifier;
      if (!alarmId) {
        return;
      }

      const alarm = await getAlarmById(alarmId);
      if (!alarm || !alarm.isActive) {
        return;
      }

      const trigger = alarmTriggerOf(alarm.trigger);
      if ((trigger === "enter" && !isEnter) || (trigger === "exit" && !isExit)) {
        return;
      }

      await triggerGeoAlarm(alarm);
    },
  );
}
