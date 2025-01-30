export function parseTextStyle(styleString: string): {
  fontFamily: string;
  fontWeight: 
    | "normal" 
    | "bold" 
    | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900"
    | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
    | "ultralight" | "thin" | "light" | "medium" | "semibold" | "heavy" | "black";
  fontSize: number;
  lineHeight: number;
} {
  if (typeof styleString !== 'string') {
    throw new Error('Input must be a string');
  }

  const parts = styleString.split(' ');

  if (parts.length < 3) {
    throw new Error('Invalid style string format. Expected at least "fontWeight fontSize/lineHeight fontFamily"');
  }

  const fontWeight = parts[0] as 
    | "normal" | "bold"
    | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900"
    | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
    | "ultralight" | "thin" | "light" | "medium" | "semibold" | "heavy" | "black";

  if (!["normal", "bold", "ultralight", "thin", "light", "medium", "semibold", "heavy", "black",
        "100", "200", "300", "400", "500", "600", "700", "800", "900",
        100, 200, 300, 400, 500, 600, 700, 800, 900].includes(fontWeight)) {
    throw new Error(`Invalid fontWeight: ${fontWeight}`);
  }

  const sizeLineHeight = parts[1];
  const fontFamily = parts.slice(2).join(' ');

  const [fontSizeStr, lineHeightStr] = sizeLineHeight.split('/');

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
