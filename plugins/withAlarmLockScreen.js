const fs = require("fs");
const path = require("path");
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withMainActivity,
} = require("expo/config-plugins");
const { addImports } = require("@expo/config-plugins/build/android/codeMod");
const { mergeContents } = require("@expo/config-plugins/build/utils/generateCode");

const LOCK_SCREEN_PERMISSIONS = [
  "android.permission.USE_FULL_SCREEN_INTENT",
  "android.permission.WAKE_LOCK",
  "android.permission.VIBRATE",
  "android.permission.ACCESS_NOTIFICATION_POLICY",
];

const BUILDER_MARKER = "ARRIVO_FULL_SCREEN_INTENT";
const FORWARDER_ACTIVITY =
  "expo.modules.notifications.service.NotificationForwarderActivity";

function patchExpoNotificationBuilder(projectRoot) {
  const file = path.join(
    projectRoot,
    "node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/notifications/presentation/builders/ExpoNotificationBuilder.kt",
  );
  if (!fs.existsSync(file)) {
    return;
  }

  let src = fs.readFileSync(file, "utf8");
  if (src.includes(BUILDER_MARKER)) {
    return;
  }

  if (!src.includes("import android.app.PendingIntent")) {
    src = src.replace(
      "import android.app.Notification\n",
      "import android.app.Notification\nimport android.app.PendingIntent\n",
    );
  }
  if (!src.includes("import android.content.Intent")) {
    src = src.replace(
      "import android.content.Context\n",
      "import android.content.Context\nimport android.content.Intent\n",
    );
  }

  const needle = `    builder.setContentIntent(
      createNotificationResponseIntent(
        context,
        notification,
        defaultAction
      )
    )`;

  const insert = `    builder.setContentIntent(
      createNotificationResponseIntent(
        context,
        notification,
        defaultAction
      )
    )

    // ${BUILDER_MARKER}: open MainActivity over the lock screen for alarm notifications.
    if (notificationContent.categoryId == "ALARM") {
      builder.setCategory(NotificationCompat.CATEGORY_ALARM)
      builder.setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      if (launchIntent != null) {
        launchIntent.addFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_CLEAR_TOP or
            Intent.FLAG_ACTIVITY_SINGLE_TOP or
            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        )
        val alarmId = notificationContent.body?.optString("alarmId").orEmpty()
        if (alarmId.isNotEmpty()) {
          launchIntent.data = android.net.Uri.parse("arrivo:///ringing?id=$alarmId")
        }
        val pendingFlags =
          PendingIntent.FLAG_UPDATE_CURRENT or
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        val requestCode = if (alarmId.isNotEmpty()) alarmId.hashCode() else 0x11e4a1
        builder.setFullScreenIntent(
          PendingIntent.getActivity(context, requestCode, launchIntent, pendingFlags),
          true,
        )
      }
    }`;

  if (!src.includes(needle)) {
    console.warn(
      "[Arrivo] Could not patch ExpoNotificationBuilder for full-screen intents.",
    );
    return;
  }

  fs.writeFileSync(file, src.replace(needle, insert));
}

try {
  patchExpoNotificationBuilder(process.cwd());
} catch (error) {
  console.warn("[Arrivo] Full-screen intent patch skipped", error);
}

function setActivityAttr(activity, name, value) {
  activity.$ = activity.$ ?? {};
  activity.$[name] = value;
}

function findActivity(application, activityName) {
  const activities = application.activity ?? [];
  return activities.find((activity) => activity.$?.["android:name"] === activityName);
}

function ensureForwarderActivity(application) {
  const existing = findActivity(application, FORWARDER_ACTIVITY);
  if (existing) {
    setActivityAttr(existing, "android:showWhenLocked", "true");
    setActivityAttr(existing, "android:turnScreenOn", "true");
    setActivityAttr(existing, "android:showForAllUsers", "true");
    return;
  }

  application.activity = application.activity ?? [];
  application.activity.push({
    $: {
      "android:name": FORWARDER_ACTIVITY,
      "android:theme": "@android:style/Theme.Translucent.NoTitleBar",
      "android:exported": "false",
      "android:excludeFromRecents": "true",
      "android:noHistory": "true",
      "android:launchMode": "standard",
      "android:taskAffinity": "",
      "android:showWhenLocked": "true",
      "android:turnScreenOn": "true",
      "android:showForAllUsers": "true",
    },
  });
}

const withLockScreenManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    AndroidConfig.Permissions.ensurePermissions(
      config.modResults,
      LOCK_SCREEN_PERMISSIONS,
    );

    const manifest = config.modResults.manifest;
    manifest.$ = manifest.$ ?? {};
    if (!manifest.$["xmlns:tools"]) {
      manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    }

    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(
      config.modResults,
    );
    setActivityAttr(mainActivity, "android:showWhenLocked", "true");
    setActivityAttr(mainActivity, "android:turnScreenOn", "true");
    setActivityAttr(mainActivity, "android:showForAllUsers", "true");

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults,
    );
    ensureForwarderActivity(application);

    return config;
  });
};

const withLockScreenMainActivity = (config) => {
  return withMainActivity(config, (config) => {
    const language = config.modResults.language;
    const isJava = language === "java";
    const semicolon = isJava ? ";" : "";

    config.modResults.contents = addImports(
      config.modResults.contents,
      ["android.os.Build"],
      language,
    );

    const src = `    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)${semicolon}
      setTurnScreenOn(true)${semicolon}
    }`;

    const result = mergeContents({
      src: config.modResults.contents,
      newSrc: src,
      tag: "arrivo-lock-screen",
      anchor: /super\.onCreate\((null|savedInstanceState)\)/,
      offset: 1,
      comment: "    //",
    });

    config.modResults.contents = result.contents;
    return config;
  });
};

const withExpoNotificationsFullscreenPatch = (config) => {
  return withDangerousMod(config, [
    "android",
    (config) => {
      patchExpoNotificationBuilder(config.modRequest.projectRoot);
      return config;
    },
  ]);
};

/**
 * Makes the Android activity able to wake the lock screen and receive
 * full-screen alarm intents from a geofence notification.
 *
 * @param {import('expo/config-plugins').ExpoConfig} config
 */
function withAlarmLockScreen(config) {
  config = AndroidConfig.Permissions.withPermissions(config, LOCK_SCREEN_PERMISSIONS);
  config = withLockScreenManifest(config);
  config = withLockScreenMainActivity(config);
  config = withExpoNotificationsFullscreenPatch(config);
  return config;
}

module.exports = withAlarmLockScreen;
