// Helper function to convert hex to rgba and apply opacity
const hexToRgba = (hex: string, opacity: number) => {
  if (!hex || typeof hex !== "string") return hex;
  let c = hex.startsWith("#") ? hex.slice(1) : hex;
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  if (c.length !== 6) return hex;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const clampedOpacity = Math.max(0, Math.min(1, opacity));
  return `rgba(${r}, ${g}, ${b}, ${clampedOpacity})`;
};

// Helper function to tint a hex color (mix with white)
const tintHexColor = (hex: string, factor: number) => {
  // factor: 0 means original, 1 means white
  if (!hex || typeof hex !== "string" || !hex.startsWith("#")) return hex;
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  const clampedFactor = Math.max(0, Math.min(1, factor));
  r = Math.round(r + (255 - r) * clampedFactor);
  g = Math.round(g + (255 - g) * clampedFactor);
  b = Math.round(b + (255 - b) * clampedFactor);
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

/**
 * Creates a glass-like light shade from a hex color.
 * @param {string} hexColor The base hex color (e.g., "#FF0000").
 * @param {number} tintFactor How much to lighten the base color (0-1).
 * 0 = original color, 1 = white. Higher values make it lighter.
 * Default is 0.7 (70% towards white).
 * @param {number} glassOpacity The opacity for the glass effect (0-1).
 * Lower values are more transparent.
 * Default is 0.25 (25% opaque).
 * @returns {string|undefined} The rgba string for the glass-like color, or undefined.
 */
export const getGlassLikeLightShade = (
  hexColor: string,
  tintFactor = 0.7,
  glassOpacity = 0.25
) => {
  if (!hexColor) {
    // console.warn("getGlassLikeLightShade: No hexColor provided.");
    return undefined; // Or return a default glass color like 'rgba(255, 255, 255, 0.2)'
  }

  // 1. Make the base color lighter
  const lighterBaseColorHex = tintHexColor(hexColor, tintFactor);

  // 2. Apply transparency to the lightened base color
  const glassColorRgba = hexToRgba(lighterBaseColorHex, glassOpacity);

  return glassColorRgba;
};
