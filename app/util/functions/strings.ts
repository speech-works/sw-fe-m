export const toSmallCaps = (str: string) =>
  str.split("").map((c) => c.toUpperCase());

export const toCamelCase = (str: string) => {
  if (!str) return;
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[A-Z]/, (m) => m.toLowerCase());
};

export const toPascalCase = (str: string) => {
  if (!str) return;
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[a-z]/, (m) => m.toUpperCase());
};
