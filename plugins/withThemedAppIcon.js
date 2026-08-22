const fs = require("fs");
const path = require("path");
const { withDangerousMod, withAndroidColorsNight } = require("expo/config-plugins");
const { generateImageAsync } = require("@expo/image-utils");

const DPI = {
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
};

async function writeWebp(projectRoot, cacheType, src, dest, size) {
  const { source } = await generateImageAsync(
    { projectRoot, cacheType },
    { src, width: size, height: size, backgroundColor: "transparent" },
  );
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, source);
}

function withNightLauncherIcons(config) {
  return withDangerousMod(config, [
    "android",
    async (mod) => {
      const projectRoot = mod.modRequest.projectRoot;
      const res = path.join(projectRoot, "android/app/src/main/res");
      const darkIcon = path.join(projectRoot, "assets/icon-dark.png");
      const darkBackground = path.join(
        projectRoot,
        "assets/android-icon-background-dark.png",
      );
      const monochrome = path.join(projectRoot, "assets/android-icon-monochrome.png");

      for (const [name, scale] of Object.entries(DPI)) {
        const mip = path.join(res, `mipmap-night-${name}`);
        const splash = path.join(res, `drawable-night-${name}`);
        const launcher = Math.round(48 * scale);
        const adaptive = Math.round(108 * scale);
        const splashSize = Math.round(288 * scale);

        await writeWebp(
          projectRoot,
          "arrivo-night-launcher",
          darkIcon,
          path.join(mip, "ic_launcher.webp"),
          launcher,
        );
        await writeWebp(
          projectRoot,
          "arrivo-night-launcher-round",
          darkIcon,
          path.join(mip, "ic_launcher_round.webp"),
          launcher,
        );
        await writeWebp(
          projectRoot,
          "arrivo-night-foreground",
          darkIcon,
          path.join(mip, "ic_launcher_foreground.webp"),
          adaptive,
        );
        await writeWebp(
          projectRoot,
          "arrivo-night-background",
          darkBackground,
          path.join(mip, "ic_launcher_background.webp"),
          adaptive,
        );
        await writeWebp(
          projectRoot,
          "arrivo-night-monochrome",
          monochrome,
          path.join(mip, "ic_launcher_monochrome.webp"),
          adaptive,
        );
        await writeWebp(
          projectRoot,
          "arrivo-night-splash",
          darkIcon,
          path.join(splash, "splashscreen_logo.png"),
          splashSize,
        );
      }

      const anyDpi = path.join(res, "mipmap-anydpi-v26");
      const nightAnyDpi = path.join(res, "mipmap-night-anydpi-v26");
      fs.mkdirSync(nightAnyDpi, { recursive: true });
      for (const file of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
        const from = path.join(anyDpi, file);
        if (fs.existsSync(from)) {
          fs.copyFileSync(from, path.join(nightAnyDpi, file));
        }
      }

      return mod;
    },
  ]);
}

function withNightColors(config) {
  return withAndroidColorsNight(config, (mod) => {
    const colors = mod.modResults;
    const assign = (name, value) => {
      colors.resources.color = colors.resources.color ?? [];
      const existing = colors.resources.color.find((item) => item.$.name === name);
      if (existing) {
        existing._ = value;
        return;
      }
      colors.resources.color.push({ $: { name }, _: value });
    };
    assign("splashscreen_background", "#000000");
    assign("iconBackground", "#000000");
    return mod;
  });
}

module.exports = function withThemedAppIcon(config) {
  config = withNightLauncherIcons(config);
  config = withNightColors(config);
  return config;
};
