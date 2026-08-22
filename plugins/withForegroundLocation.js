const {
  AndroidConfig,
  withAndroidManifest,
} = require("expo/config-plugins");

const FOREGROUND_PERMISSIONS = [
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_LOCATION",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.WAKE_LOCK",
  "android.permission.VIBRATE",
  "android.permission.USE_FULL_SCREEN_INTENT",
];

const BACKGROUND_LOCATION = "android.permission.ACCESS_BACKGROUND_LOCATION";

function setActivityAttr(activity, name, value) {
  activity.$ = activity.$ ?? {};
  activity.$[name] = value;
}

function blockBackgroundLocation(androidManifest) {
  const manifest = androidManifest.manifest;
  manifest.$ = manifest.$ ?? {};
  if (!manifest.$["xmlns:tools"]) {
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
  }

  AndroidConfig.Permissions.removePermissions(androidManifest, [BACKGROUND_LOCATION]);

  const permissions = androidManifest.manifest["uses-permission"] ?? [];
  permissions.push({
    $: {
      "android:name": BACKGROUND_LOCATION,
      "tools:node": "remove",
    },
  });
  androidManifest.manifest["uses-permission"] = permissions;
}

const withForegroundLocationManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    AndroidConfig.Permissions.ensurePermissions(
      config.modResults,
      FOREGROUND_PERMISSIONS,
    );
    blockBackgroundLocation(config.modResults);

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults,
    );
    application.$ = application.$ ?? {};
    application.$["android:allowBackup"] = "false";

    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(
      config.modResults,
    );
    setActivityAttr(mainActivity, "android:showWhenLocked", "true");
    setActivityAttr(mainActivity, "android:turnScreenOn", "true");

    return config;
  });
};

/**
 * Foreground-only location on Android: FGS type=location, no ACCESS_BACKGROUND_LOCATION.
 *
 * @param {import('expo/config-plugins').ExpoConfig} config
 */
function withForegroundLocation(config) {
  config = AndroidConfig.Permissions.withPermissions(config, FOREGROUND_PERMISSIONS);
  config = withForegroundLocationManifest(config);
  return config;
}

module.exports = withForegroundLocation;
