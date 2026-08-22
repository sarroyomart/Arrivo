import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState, Linking, Platform } from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

import {
  canUseFullScreenIntent,
  openFullScreenIntentSettings,
} from "@/modules/system-sounds";
import { ensureAlarmNotificationChannel } from "@/src/services/notifications";
import {
  getOnboardingCompleted,
  setOnboardingCompleted as persistOnboardingCompleted,
} from "@/src/services/storage";

export type PermissionState = "pending" | "granted" | "denied";
export type PermissionRequestKey =
  | "foreground"
  | "background"
  | "notifications"
  | "fullScreenIntent";

export type PermissionsContextValue = {
  foregroundLocation: PermissionState;
  backgroundLocation: PermissionState;
  notifications: PermissionState;
  fullScreenIntent: PermissionState;
  needsFullScreenIntent: boolean;
  needsBackgroundLocation: boolean;
  allPermissionsGranted: boolean;
  isChecking: boolean;
  requesting: PermissionRequestKey | null;
  onboardingCompleted: boolean;
  needsOnboarding: boolean;
  requestForeground: () => Promise<PermissionState>;
  requestBackground: () => Promise<PermissionState>;
  requestNotifications: () => Promise<PermissionState>;
  requestFullScreenIntent: () => Promise<PermissionState>;
  openSettings: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  refresh: (isInitial?: boolean) => Promise<void>;
};

function toPermissionState(status: string, granted: boolean): PermissionState {
  if (granted || status === "granted") {
    return "granted";
  }
  if (status === "denied") {
    return "denied";
  }
  return "pending";
}

/** Android 10+ “Allow all the time” — never requested. iOS still needs Always for geofences. */
export function needsBackgroundLocationPermission(): boolean {
  return Platform.OS === "ios";
}

/** Android 14+ (API 34) requires a special settings toggle for full-screen alarms. */
export function needsFullScreenIntentPermission(): boolean {
  if (Platform.OS !== "android") {
    return false;
  }
  const version = typeof Platform.Version === "number" ? Platform.Version : Number(Platform.Version);
  return Number.isFinite(version) && version >= 34;
}

async function readFullScreenIntentState(): Promise<PermissionState> {
  if (!needsFullScreenIntentPermission()) {
    return "granted";
  }
  try {
    return (await canUseFullScreenIntent()) ? "granted" : "pending";
  } catch {
    return "pending";
  }
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

function usePermissionsController(): PermissionsContextValue {
  const [foregroundLocation, setForegroundLocation] =
    useState<PermissionState>("pending");
  const [backgroundLocation, setBackgroundLocation] =
    useState<PermissionState>("pending");
  const [notifications, setNotifications] = useState<PermissionState>("pending");
  const [fullScreenIntent, setFullScreenIntent] = useState<PermissionState>(
    needsFullScreenIntentPermission() ? "pending" : "granted",
  );
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [skippedThisSession, setSkippedThisSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [requesting, setRequesting] = useState<PermissionRequestKey | null>(null);

  const refresh = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setIsChecking(true);
    }

    try {
      const completedPromise = getOnboardingCompleted();
      const fullScreenPromise = readFullScreenIntentState();
      const foregroundPromise = Location.getForegroundPermissionsAsync();
      const notificationPromise = Notifications.getPermissionsAsync();
      const backgroundPromise = needsBackgroundLocationPermission()
        ? Location.getBackgroundPermissionsAsync()
        : Promise.resolve({ status: "granted", granted: true });

      const [foreground, background, notification, completed, fullScreen] = await Promise.all([
        foregroundPromise,
        backgroundPromise,
        notificationPromise,
        completedPromise,
        fullScreenPromise,
      ]);

      setForegroundLocation(toPermissionState(foreground.status, foreground.granted));
      setBackgroundLocation(toPermissionState(background.status, background.granted));
      const notificationState = toPermissionState(
        notification.status,
        notification.granted,
      );
      setNotifications(notificationState);
      setFullScreenIntent(fullScreen);
      setOnboardingCompleted(completed);

      if (notificationState === "granted") {
        await ensureAlarmNotificationChannel();
      }
    } catch {
      // Keep the last known state if the OS check fails (e.g. web / Expo Go limits).
    } finally {
      if (isInitial) {
        setIsChecking(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh(true);

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void refresh(false);
      }
    });

    return () => subscription.remove();
  }, [refresh]);

  const requestForeground = useCallback(async (): Promise<PermissionState> => {
    setRequesting("foreground");
    try {
      const result = await Location.requestForegroundPermissionsAsync();
      const next = toPermissionState(result.status, result.granted);
      setForegroundLocation(next);
      return next;
    } catch {
      setForegroundLocation("denied");
      return "denied";
    } finally {
      setRequesting(null);
    }
  }, []);

  const requestBackground = useCallback(async (): Promise<PermissionState> => {
    if (!needsBackgroundLocationPermission()) {
      setBackgroundLocation("granted");
      return "granted";
    }

    let foreground = foregroundLocation;
    if (foreground !== "granted") {
      const current = await Location.getForegroundPermissionsAsync();
      foreground = toPermissionState(current.status, current.granted);
      setForegroundLocation(foreground);
    }

    if (foreground !== "granted") {
      return backgroundLocation;
    }

    setRequesting("background");
    try {
      const result = await Location.requestBackgroundPermissionsAsync();
      const next = toPermissionState(result.status, result.granted);
      setBackgroundLocation(next);
      return next;
    } catch {
      setBackgroundLocation("denied");
      return "denied";
    } finally {
      setRequesting(null);
    }
  }, [backgroundLocation, foregroundLocation]);

  const requestNotifications = useCallback(async (): Promise<PermissionState> => {
    setRequesting("notifications");
    try {
      const result = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      await ensureAlarmNotificationChannel();
      const next = toPermissionState(result.status, result.granted);
      setNotifications(next);
      return next;
    } catch {
      setNotifications("denied");
      return "denied";
    } finally {
      setRequesting(null);
    }
  }, []);

  const requestFullScreenIntent = useCallback(async (): Promise<PermissionState> => {
    if (!needsFullScreenIntentPermission()) {
      setFullScreenIntent("granted");
      return "granted";
    }

    setRequesting("fullScreenIntent");
    try {
      try {
        await openFullScreenIntentSettings();
      } catch {
        await Linking.openSettings();
      }
      const next = await readFullScreenIntentState();
      setFullScreenIntent(next);
      return next;
    } catch {
      setFullScreenIntent("pending");
      return "pending";
    } finally {
      setRequesting(null);
    }
  }, []);

  const openSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  const completeOnboarding = useCallback(async () => {
    await persistOnboardingCompleted(true);
    setOnboardingCompleted(true);
  }, []);

  const skipOnboarding = useCallback(async () => {
    await persistOnboardingCompleted(true);
    setOnboardingCompleted(true);
    setSkippedThisSession(true);
  }, []);

  const needsFullScreenIntent = needsFullScreenIntentPermission();
  const needsBackgroundLocation = needsBackgroundLocationPermission();

  const allPermissionsGranted =
    foregroundLocation === "granted" &&
    (!needsBackgroundLocation || backgroundLocation === "granted") &&
    notifications === "granted" &&
    (!needsFullScreenIntent || fullScreenIntent === "granted");

  const needsOnboarding =
    !skippedThisSession &&
    (!onboardingCompleted ||
      (needsBackgroundLocation && backgroundLocation !== "granted") ||
      (needsFullScreenIntent && fullScreenIntent !== "granted"));

  return {
    foregroundLocation,
    backgroundLocation,
    notifications,
    fullScreenIntent,
    needsFullScreenIntent,
    needsBackgroundLocation,
    allPermissionsGranted,
    isChecking,
    requesting,
    onboardingCompleted,
    needsOnboarding,
    requestForeground,
    requestBackground,
    requestNotifications,
    requestFullScreenIntent,
    openSettings,
    completeOnboarding,
    skipOnboarding,
    refresh,
  };
}

export function PermissionsProvider({ children }: PropsWithChildren) {
  const value = usePermissionsController();
  return createElement(PermissionsContext.Provider, { value }, children);
}

export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error("usePermissions must be used within PermissionsProvider");
  }
  return ctx;
}
