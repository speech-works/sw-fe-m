export const toPascalCase = (str: string) => {
  if (!str) return;
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[a-z]/, (m) => m.toUpperCase());
};
