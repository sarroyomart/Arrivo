export type Locale = "es" | "en";

export type Messages = {
  app: {
    name: string;
  };
  nav: {
    home: string;
    newAlarm: string;
    editAlarm: string;
    mapPicker: string;
    ringing: string;
    onboarding: string;
    privacy: string;
    licenses: string;
  };
  screens: {
    home: {
      title: string;
      subtitle: string;
    };
    alarm: {
      nameLabel: string;
      namePlaceholder: string;
      radiusValue: string;
      locationLabel: string;
      selectOnMap: string;
      colorLabel: string;
      iconLabel: string;
      soundLabel: string;
      triggerLabel: string;
      triggerOnEnter: string;
      triggerOnExit: string;
    };
    mapPicker: {
      title: string;
      searchPlaceholder: string;
      searchHint: string;
      searchAction: string;
      confirm: string;
      hint: string;
      locating: string;
      locationDenied: string;
    };
    ringing: {
      title: string;
      subtitle: string;
      titleExit: string;
      subtitleExit: string;
      snoozeHint: string;
    };
    onboarding: {
      title: string;
      subtitle: string;
      privacyTitle: string;
      privacy: string;
      skipTitle: string;
      skipBody: string;
      openPrivacy: string;
      openLicenses: string;
    };
    guide: {
      title: string;
      subtitle: string;
      createTitle: string;
      createBody: string;
      activateTitle: string;
      activateBody: string;
      tripTitle: string;
      tripBody: string;
      ringTitle: string;
      ringBody: string;
      mapTitle: string;
      mapBody: string;
    };
  };
  permissions: {
    locationWhenInUse: {
      title: string;
      body: string;
      footnote: string;
    };
    locationAlways: {
      title: string;
      body: string;
      footnote: string;
    };
    notifications: {
      title: string;
      body: string;
    };
    fullScreenIntent: {
      title: string;
      body: string;
      footnote: string;
    };
    denied: {
      title: string;
    };
    continue: string;
    allow: string;
    skip: string;
    granted: string;
    ready: string;
    openSettings: string;
  };
  foregroundService: {
    title: string;
    body: string;
    near: string;
    inside: string;
    more: string;
  };
  tabs: {
    map: string;
    alarms: string;
    permissions: string;
    howTo: string;
  };
  map: {
    no_active_alarms: string;
    center_me: string;
    edit: string;
    distance: string;
    unknown_distance: string;
  };
  legal: {
    privacyUpdated: string;
    localTitle: string;
    localBody: string;
    networkTitle: string;
    networkBody: string;
    audioTitle: string;
    audioBody: string;
    thirdPartiesTitle: string;
    thirdPartiesBody: string;
    rightsTitle: string;
    rightsBody: string;
    openInBrowser: string;
    licensesIntro: string;
    licensesList: string;
  };
  empty: {
    title: string;
    body: string;
    cta: string;
  };
  buttons: {
    stopAlarm: string;
    snooze: string;
    snoozeMinutes: string;
    saveAndActivate: string;
    saveChanges: string;
    cancel: string;
    delete: string;
    deleteAlarm: string;
    back: string;
    start: string;
  };
  triggers: {
    onEnter: string;
    onExit: string;
  };
  radius: {
    custom: string;
    chip100: string;
    chip500: string;
    chip1km: string;
    kilometers: string;
  };
  zoneColors: {
    orange: string;
    teal: string;
    blue: string;
    violet: string;
    rose: string;
    slate: string;
  };
  icons: {
    pin: string;
    home: string;
    briefcase: string;
    school: string;
    train: string;
    "shopping-cart": string;
    dumbbell: string;
    coffee: string;
  };
  sounds: {
    default: string;
    gentle: string;
    urgent: string;
    vibration: string;
    modeSystem: string;
    modeCustom: string;
    modeVibration: string;
    pickFile: string;
    changeFile: string;
    noFile: string;
    customHint: string;
    vibrationHint: string;
    systemHint: string;
    systemHintIos: string;
    systemDefault: string;
    systemLoadFailed: string;
  };
  geofenceLimit: {
    title: string;
    body: string;
  };
  alarmNotification: {
    channelName: string;
    title: string;
    body: string;
    exitTitle: string;
    exitBody: string;
    snoozeTitle: string;
    snoozeBody: string;
  };
  alarm: {
    radiusMeters: string;
    radiusLabel: string;
    deleteConfirmTitle: string;
    deleteConfirmMessage: string;
  };
  errors: {
    loadAlarms: string;
    titleRequired: string;
    locationRequired: string;
    saveFailed: string;
    alarmNotFound: string;
    noPlaces: string;
    customSoundFailed: string;
    unsupportedAudio: string;
  };
  a11y: {
    settings: string;
    newAlarm: string;
    toggleAlarm: string;
    deleteAlarm: string;
    clearSearch: string;
    searchPlaces: string;
    submitSearch: string;
    osmAttribution: string;
    centerOnMe: string;
    selectZoneColor: string;
    selectIcon: string;
    previewSound: string;
    pickCustomSound: string;
    snoozeFor: string;
    languageEs: string;
    languageEn: string;
    goBack: string;
  };
};

export type MessageKey = {
  [K in keyof Messages]: Messages[K] extends string
    ? K
    : {
        [L in keyof Messages[K]]: Messages[K][L] extends string
          ? `${K & string}.${L & string}`
          : {
              [M in keyof Messages[K][L]]: `${K & string}.${L & string}.${M & string}`;
            }[keyof Messages[K][L]];
      }[keyof Messages[K]];
}[keyof Messages];
