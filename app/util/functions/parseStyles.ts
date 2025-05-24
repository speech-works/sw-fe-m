export function parseTextStyle(styleString: string): {
  fontFamily: string;
  fontWeight:
    | "normal"
    | "bold"
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900"
    | 100
    | 200
    | 300
    | 400
    | 500
    | 600
    | 700
    | 800
    | 900
    | "ultralight"
    | "thin"
    | "light"
    | "medium"
    | "semibold"
    | "heavy"
    | "black";
  fontSize: number;
  lineHeight: number;
} {
  if (typeof styleString !== "string") {
    throw new Error("Input must be a string");
  }

  const parts = styleString.split(" ");

  if (parts.length < 3) {
    throw new Error(
      'Invalid style string format. Expected at least "fontWeight fontSize/lineHeight fontFamily"'
    );
  }

  const fontWeight = parts[0] as
    | "normal"
    | "bold"
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900"
    | 100
    | 200
    | 300
    | 400
    | 500
    | 600
    | 700
    | 800
    | 900
    | "ultralight"
    | "thin"
    | "light"
    | "medium"
    | "semibold"
    | "heavy"
    | "black";

  if (
    ![
      "normal",
      "bold",
      "ultralight",
      "thin",
      "light",
      "medium",
      "semibold",
      "heavy",
      "black",
      "100",
      "200",
      "300",
      "400",
      "500",
      "600",
      "700",
      "800",
      "900",
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900,
    ].includes(fontWeight)
  ) {
    throw new Error(`Invalid fontWeight: ${fontWeight}`);
  }

  const sizeLineHeight = parts[1];
  const fontFamily = parts.slice(2).join(" ");

  const [fontSizeStr, lineHeightStr] = sizeLineHeight.split("/");

  const fontSize = parseFloat(fontSizeStr);
  const lineHeight = parseFloat(lineHeightStr);

  if (isNaN(fontSize) || isNaN(lineHeight)) {
    throw new Error("Font size and line height must be numeric values");
  }

  return {
    fontFamily,
    fontWeight,
    fontSize,
    lineHeight,
  };
}

/**
 * Parse a CSS "box-shadow" string into a React Native shadow style.
 *
 * Expected formats (all values in px or valid CSS color at the end):
 *   "offsetX offsetY blurRadius spreadRadius color"
 *   "offsetX offsetY blurRadius color"
 *
 * Examples:
 *   parseShadowStyle("0px 2px 5px rgba(0, 0, 0, 0.1)");
 *   // → { shadowColor: "rgba(0,0,0,0.1)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5 }
 *
 *   parseShadowStyle("1px 1px 3px 0px rgba(10, 10, 10, 0.2)");
 *   // → { shadowColor: "rgba(10,10,10,0.2)", shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3 }
 */
export function parseShadowStyle(shadowString: string): {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  // Optional: React Native on Android only uses elevation
  elevation?: number;
} {
  if (typeof shadowString !== "string") {
    throw new Error("Input must be a CSS-style shadow string");
  }

  // First, split out the color part. We'll look for the last "rgba(...)" or "rgb(...)" or hex.
  // A simple heuristic: find the first occurrence of "rgba" or "rgb" or "#" and assume the rest is the color.
  const colorMatch = shadowString.match(/(rgba?\([^)]*\)|#[0-9A-Fa-f]{3,8})$/);
  if (!colorMatch) {
    throw new Error(
      "Invalid shadow string: could not find a valid color at the end"
    );
  }
  const colorString = colorMatch[1];
  // The remainder (before the color) is the four (or three) length values.
  const lengthsPortion = shadowString
    .slice(0, shadowString.lastIndexOf(colorString))
    .trim();

  // Split by whitespace; should yield 3 or 4 parts like ["0px", "2px", "5px", "0px"]
  const lengthParts = lengthsPortion.split(/\s+/);
  if (lengthParts.length < 3 || lengthParts.length > 4) {
    throw new Error(
      "Invalid shadow string: expected 3 or 4 length values before the color"
    );
  }

  // Parse offsetX, offsetY, blurRadius, (optional) spreadRadius
  const parsePx = (px: string): number => {
    if (!px.endsWith("px")) {
      throw new Error(`Invalid length unit in "${px}", expected "px"`);
    }
    const num = parseFloat(px.replace("px", ""));
    if (isNaN(num)) {
      throw new Error(`Cannot parse numeric value from "${px}"`);
    }
    return num;
  };

  const offsetX = parsePx(lengthParts[0]);
  const offsetY = parsePx(lengthParts[1]);
  const blurRadius = parsePx(lengthParts[2]);
  // We can safely ignore spreadRadius for React Native shadows, so we don't need it:
  // const spreadRadius = lengthParts.length === 4 ? parsePx(lengthParts[3]) : 0;

  // Now parse the color string to extract opacity (for shadowOpacity) and shadowColor
  // If it's rgba(...) we can extract the alpha; if it's rgb(...) we treat alpha = 1.
  let shadowOpacity = 1;
  let shadowColor = colorString;
  const rgbaMatch = colorString.match(
    /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([01]?\.?\d*)\s*\)$/
  );
  const rgbMatch = colorString.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/);
  if (rgbaMatch) {
    // e.g. ["rgba(0,0,0,0.1)", "0", "0", "0", "0.1"]
    shadowOpacity = parseFloat(rgbaMatch[4]);
    shadowColor = `rgb(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]})`;
  } else if (rgbMatch) {
    shadowOpacity = 1;
    shadowColor = `rgb(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]})`;
  } else {
    // It could be a hex like "#00000080" or "#000" etc. In that case, we set opacity = 1
    shadowOpacity = 1;
    // React Native on iOS/Android can accept a hex with alpha, so we leave shadowColor = colorString
  }

  // Build the React Native shadow style object
  const styleObject: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation?: number;
  } = {
    shadowColor,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity,
    shadowRadius: blurRadius,
  };

  // Optionally, set a rough "elevation" for Android. You could map blurRadius → elevation,
  // but since Android’s elevation is not one‐to‐one with iOS shadow parameters, you might
  // choose a fixed heuristic. For example:
  styleObject.elevation = Math.round(blurRadius / 2);

  return styleObject;
}
