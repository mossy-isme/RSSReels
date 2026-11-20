import type { ConfigContext, ExpoConfig } from "expo/config";
import { withAppBuildGradle, type ConfigPlugin } from "expo/config-plugins";

/**
 * Builds made by F-Droid set FDROID=1. F-Droid's inclusion policy forbids
 * downloading code that F-Droid didn't build itself, so those builds turn
 * EAS Update off. All other builds (EAS preview/production) keep it on.
 */
const isFdroidBuild = process.env.FDROID === "1";

/**
 * The generated android/app/build.gradle signs release builds with the
 * debug keystore. F-Droid signs APKs with its own key and expects an
 * unsigned release build (app-release-unsigned.apk), so drop that line.
 */
const withUnsignedRelease: ConfigPlugin = (config) =>
  withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = mod.modResults.contents.replace(
      /(release\s*\{[^}]*?)\n\s*signingConfig signingConfigs\.debug/,
      "$1",
    );
    return mod;
  });

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  if (!isFdroidBuild) {
    return base;
  }
  return withUnsignedRelease({
    ...base,
    updates: { enabled: false, checkAutomatically: "NEVER" },
  });
};
