const parseHex = (color: string): { r: number; g: number; b: number } | null => {
  let hex = color.trim().replace("#", "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (hex.length === 8) hex = hex.slice(0, 6);
  if (hex.length !== 6) return null;
  const n = parseInt(hex, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

/** Applies alpha to a design-system colour token while preserving RGB values. */
export const withAlpha = (color: string, alpha: number): string => {
  const clamped = Math.max(0, Math.min(1, alpha));
  const rgba = color.match(/rgba?\(([^)]+)\)/i);
  if (rgba) {
    const [r, g, b] = rgba[1].split(",").map((part) => parseFloat(part.trim()));
    if ([r, g, b].every((value) => !Number.isNaN(value))) {
      return `rgba(${r},${g},${b},${clamped})`;
    }
  }

  const parsed = parseHex(color);
  if (!parsed) return color;
  return `rgba(${parsed.r},${parsed.g},${parsed.b},${clamped})`;
};
