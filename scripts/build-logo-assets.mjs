import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateImageAsync } from "@expo/image-utils";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = join(projectRoot, "app", "assets");
const svgRoot = join(assetRoot, "svg logos");
const logoSource = join(svgRoot, "sw-logo.svg");
const appLogoOriginalSource = join(svgRoot, "app-logo-original.png");
const appLogoSource = join(svgRoot, "app-logo.png");

const source = readFileSync(logoSource, "utf8");
const paths = [...source.matchAll(/<path\b[^>]*\/>/g)].map(([path]) =>
  path.replace(/\sfill="[^"]*"/, ""),
);

if (paths.length !== 2) {
  throw new Error(`Expected two logo contours in sw-logo.svg; found ${paths.length}.`);
}

const geometry = paths.join("\n  ");
const markVariants = new Map([
  ["sw-mark.svg", "currentColor"],
  ["sw-mark-white.svg", "#FFFFFF"],
  ["sw-mark-black.svg", "#000000"],
  ["sw-mark-ink.svg", "#141311"],
  ["sw-mark-amber.svg", "#F5A623"],
]);

for (const [filename, fill] of markVariants) {
  writeFileSync(
    join(svgRoot, filename),
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1254 1254" fill="${fill}">\n` +
      `  ${geometry}\n` +
      `</svg>\n`,
  );
}

const iconFiles = [
  "sw-icon-flat-white.svg",
  "sw-icon-flat.svg",
  "sw-icon-rounded-white.svg",
  "sw-icon-rounded.svg",
  "sw-icon-white.svg",
  "sw-icon.svg",
];

for (const filename of iconFiles) {
  const file = join(svgRoot, filename);
  const original = readFileSync(file, "utf8");
  const withNewGeometry = original.replace(
    /<g id="m">[\s\S]*?<\/g>/,
    `<g id="m">${paths.join("")}</g>`,
  );
  const centered = withNewGeometry.replace(
    /transform="translate\(512(?:\.0)? 512(?:\.0)?\) scale\([^)]+\) translate\(-619\.4000 -625\.9500\)"/g,
    `transform="translate(512 512) scale(0.75) translate(-627 -627)"`,
  );

  if (!centered.includes(paths[0]) || !centered.includes("translate(-627 -627)")) {
    throw new Error(`Could not verify the logo geometry in ${filename}.`);
  }

  writeFileSync(file, centered);
}

const embeddedMark = `<g id="speechworks-mark">${paths.join("")}</g>`;
const transparentAsset = (scale) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">\n` +
  `  <defs>${embeddedMark}</defs>\n` +
  `  <use href="#speechworks-mark" transform="translate(512 512) scale(${scale}) translate(-627 -627)" fill="#FFFFFF"/>\n` +
  `</svg>\n`;

const splashSource = join(svgRoot, "sw-splash.svg");
const adaptiveSource = join(svgRoot, "sw-adaptive-foreground.svg");
writeFileSync(splashSource, transparentAsset(0.486));
writeFileSync(adaptiveSource, transparentAsset(0.58));

writeFileSync(
  join(svgRoot, "icon-composer", "layer-2-foreground.svg"),
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">\n` +
    `  <g fill="#FFF9F0" transform="translate(512 512) scale(0.75) translate(-627 -627)">\n` +
    `    ${geometry}\n` +
    `  </g>\n` +
    `</svg>\n`,
);

const render = (input, output, size) => {
  execFileSync("rsvg-convert", [
    "-w",
    String(size),
    "-h",
    String(size),
    input,
    "-o",
    output,
  ]);
};

import { PNG } from "pngjs";

const cropAndScalePNG = (inputBuffer, cropX, cropY, cropW, cropH, targetW, targetH) => {
  const src = PNG.sync.read(inputBuffer);
  const dst = new PNG({ width: targetW, height: targetH });

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const srcX = cropX + (x / targetW) * cropW;
      const srcY = cropY + (y / targetH) * cropH;

      const x0 = Math.floor(srcX);
      const x1 = Math.min(x0 + 1, src.width - 1);
      const y0 = Math.floor(srcY);
      const y1 = Math.min(y0 + 1, src.height - 1);

      const dx = srcX - x0;
      const dy = srcY - y0;

      const idx00 = (src.width * y0 + x0) << 2;
      const idx10 = (src.width * y0 + x1) << 2;
      const idx01 = (src.width * y1 + x0) << 2;
      const idx11 = (src.width * y1 + x1) << 2;

      const dstIdx = (targetW * y + x) << 2;

      for (let c = 0; c < 4; c++) {
        const val =
          (1 - dx) * (1 - dy) * src.data[idx00 + c] +
          dx * (1 - dy) * src.data[idx10 + c] +
          (1 - dx) * dy * src.data[idx01 + c] +
          dx * dy * src.data[idx11 + c];
        dst.data[dstIdx + c] = Math.round(val);
      }
    }
  }
  return PNG.sync.write(dst);
};

/**
 * The original render includes a second black frame around the wavy tile. Store
 * masks then shrink that whole framed object, which makes the actual mark look
 * much smaller than neighbouring app icons. Crop from the preserved original
 * to a square fully inside the tile instead: the texture becomes full bleed and
 * the 544x605 orange mark sits in a 605px square safe area with 122px of equal
 * padding on every side. Its narrower horizontal silhouette naturally leaves a
 * little more visible texture at left and right. The extra space also keeps its
 * shadow clear of Android's circular legacy mask.
 */
const APP_LOGO_SOURCE_SIZE = 1254;
const APP_LOGO_CROP = { x: 219, y: 183, size: 850 };
const appLogoOriginal = readFileSync(appLogoOriginalSource);
const appLogoCropped = cropAndScalePNG(
  appLogoOriginal,
  APP_LOGO_CROP.x,
  APP_LOGO_CROP.y,
  APP_LOGO_CROP.size,
  APP_LOGO_CROP.size,
  APP_LOGO_SOURCE_SIZE,
  APP_LOGO_SOURCE_SIZE,
);
writeFileSync(appLogoSource, appLogoCropped);

const renderAppLogo = async (output, size) => {
  const appLogoBuf = readFileSync(appLogoSource);
  const resized = cropAndScalePNG(
    appLogoBuf,
    0,
    0,
    APP_LOGO_SOURCE_SIZE,
    APP_LOGO_SOURCE_SIZE,
    size,
    size,
  );
  writeFileSync(output, resized);
};

// The photographic logo is the canonical store/launcher artwork. Apple gets
// an opaque 1024px source; Google Play Console needs a separate 512px upload.
await renderAppLogo(join(assetRoot, "icon.png"), 1024);
await renderAppLogo(join(assetRoot, "play-store-icon.png"), 512);

// android.adaptiveIcon overrides expo.icon, so its foreground must also use
// the canonical artwork or Android would continue shipping the previous mark.
await renderAppLogo(join(assetRoot, "adaptive-icon.png"), 1024);
render(join(svgRoot, "sw-icon-rounded-white.svg"), join(assetRoot, "favicon.png"), 96);
render(splashSource, join(assetRoot, "splash-icon.png"), 1024);
render(adaptiveSource, join(assetRoot, "adaptive-icon-mono.png"), 1024);
