/**
 * withMediaPipeDuplicateFix.js
 *
 * Fixes a duplicate symbol linker error that occurs when both:
 *   - ExpoFaceLandmarker (MediaPipeTasksCommon) and
 *   - VisionCameraFaceDetector (MLKit)
 * are installed together.
 *
 * MediaPipeTasksCommon already bundles GTMSessionFetcher and GoogleToolboxForMac
 * internally. MLKit also links them as separate static libs, causing 221 duplicate
 * symbol errors at link time.
 *
 * This plugin injects a post_install hook into the generated Podfile (during
 * expo prebuild) that strips the duplicate -l flags from the aggregate app xcconfigs.
 */

const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const HOOK_MARKER = "# [withMediaPipeDuplicateFix]";

const POST_INSTALL_HOOK = `
  ${HOOK_MARKER} - MediaPipeTasksCommon already bundles GTMSessionFetcher and
  # GoogleToolboxForMac internally. MLKit also links these as separate static
  # libs, causing 221 duplicate symbol errors at link time.
  # Strip the duplicate -l flags from the aggregate app xcconfigs.
  installer.aggregate_targets.each do |aggregate_target|
    aggregate_target.xcconfigs.each_key do |config_name|
      xcconfig_path = aggregate_target.support_files_dir + "\#{aggregate_target.label}.\#{config_name}.xcconfig"
      if File.exist?(xcconfig_path)
        xcconfig = File.read(xcconfig_path)
        xcconfig = xcconfig.gsub(' -l"GTMSessionFetcher"', '')
        xcconfig = xcconfig.gsub(' -l"GoogleToolboxForMac"', '')
        File.write(xcconfig_path, xcconfig)
      end
    end
  end
`;

/** @type {import('@expo/config-plugins').ConfigPlugin} */
const withMediaPipeDuplicateFix = (config) => {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      if (!fs.existsSync(podfilePath)) {
        console.warn("[withMediaPipeDuplicateFix] Podfile not found, skipping.");
        return config;
      }

      let podfile = fs.readFileSync(podfilePath, "utf-8");

      // Idempotent: only inject once
      if (podfile.includes(HOOK_MARKER)) {
        return config;
      }

      // Inject just before the closing `end` of the post_install block
      podfile = podfile.replace(
        /(\s+end\s*\nend\s*$)/,
        `${POST_INSTALL_HOOK}$1`
      );

      fs.writeFileSync(podfilePath, podfile);
      console.log("[withMediaPipeDuplicateFix] ✅ Injected MediaPipe duplicate-symbol fix into Podfile.");

      return config;
    },
  ]);
};

module.exports = withMediaPipeDuplicateFix;
