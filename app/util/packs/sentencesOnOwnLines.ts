/**
 * Puts each sentence of a one-block text in its own paragraph, so a long
 * instruction reads as short lines. No word changes. Text that already has line
 * breaks or a list has its own layout and is left alone.
 */
export function sentencesOnOwnLines(text: string): string {
  if (!text || text.includes("\n")) return text;
  return text.replace(/([.?!]["”]?)\s+(?=[A-Z"“])/g, "$1\n\n");
}
