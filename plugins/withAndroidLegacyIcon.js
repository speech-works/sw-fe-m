const { createHash } = require("node:crypto");
const { promises: fs } = require("node:fs");
const path = require("node:path");
const { withDangerousMod } = require("expo/config-plugins");
const { generateImageAsync } = require("@expo/image-utils");

const DPI = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

/**
 * Expo derives pre-Android-8 launcher images from adaptiveIcon.foregroundImage.
 * That is correct for a conventional transparent glyph, but ours is deliberately
 * inset for Android's adaptive viewport and therefore looks too small when
 * rendered without the adaptive mask. Generate the legacy pair from the icon
 * instead so every Android version gets the same full-bleed composition.
 */
const generateLegacyIconsAsync = async (projectRoot, icon) => {
  const iconPath = path.resolve(projectRoot, icon);
  const iconBuffer = await fs.readFile(iconPath);
  const sourceHash = createHash("sha256").update(iconBuffer).digest("hex").slice(0, 12);

  await Promise.all(
    Object.entries(DPI).map(async ([folder, size]) => {
      const outputDirectory = path.join(
        projectRoot,
        "android/app/src/main/res",
        folder,
      );
      await fs.mkdir(outputDirectory, { recursive: true });

      const common = {
        src: iconPath,
        width: size,
        height: size,
        resizeMode: "cover",
        backgroundColor: "#141311",
      };
      const square = await generateImageAsync(
        { projectRoot, cacheType: `speechworks-legacy-square-${sourceHash}` },
        common,
      );
      const round = await generateImageAsync(
        { projectRoot, cacheType: `speechworks-legacy-round-alpha-${sourceHash}` },
        { ...common, backgroundColor: "transparent", borderRadius: size / 2 },
      );

      await Promise.all([
        fs.writeFile(path.join(outputDirectory, "ic_launcher.webp"), square.source),
        fs.writeFile(path.join(outputDirectory, "ic_launcher_round.webp"), round.source),
      ]);
    }),
  );
};

/** @type {import("expo/config-plugins").ConfigPlugin} */
const withAndroidLegacyIcon = (config) =>
  withDangerousMod(config, [
    "android",
    async (config) => {
      const icon = config.android?.icon ?? config.icon;
      if (icon) await generateLegacyIconsAsync(config.modRequest.projectRoot, icon);
      return config;
    },
  ]);

module.exports = withAndroidLegacyIcon;
module.exports.generateLegacyIconsAsync = generateLegacyIconsAsync;
