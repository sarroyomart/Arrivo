export type GeofenceTriggeredEvent = {
  id: string;
  title?: string;
  trigger?: string;
};

export type NativeTrackedAlarm = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  radius: number;
  trigger: string;
  channelId: string;
  silent: boolean;
  launchUrl: string;
  alarmTitle: string;
  alarmBody: string;
};

export type OngoingTrackingCopy = {
  title: string;
  body: string;
  near: string;
  inside: string;
  more: string;
  locale: string;
};
