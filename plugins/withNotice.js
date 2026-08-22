const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("expo/config-plugins");

function copyNotice(projectRoot, destinationDir) {
  const src = path.join(projectRoot, "NOTICE");
  if (!fs.existsSync(src)) {
    console.warn("[Arrivo] NOTICE file missing; skip bundling.");
    return;
  }
  fs.mkdirSync(destinationDir, { recursive: true });
  fs.copyFileSync(src, path.join(destinationDir, "NOTICE"));
}

/**
 * Ships the Apache-2.0 NOTICE inside the Android AAB
 * (`app/src/main/assets/NOTICE`) and the iOS app bundle.
 *
 * @param {import('expo/config-plugins').ExpoConfig} config
 */
function withNotice(config) {
  config = withDangerousMod(config, [
    "android",
    (config) => {
      copyNotice(
        config.modRequest.projectRoot,
        path.join(config.modRequest.platformProjectRoot, "app/src/main/assets"),
      );
      return config;
    },
  ]);

  config = withDangerousMod(config, [
    "ios",
    (config) => {
      copyNotice(
        config.modRequest.projectRoot,
        path.join(
          config.modRequest.platformProjectRoot,
          config.modRequest.projectName ?? "Arrivo",
        ),
      );
      return config;
    },
  ]);

  return config;
}

module.exports = withNotice;
