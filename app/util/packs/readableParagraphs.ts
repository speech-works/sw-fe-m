/**
 * Breaks one long paragraph into short ones at sentence ends, for reading on a
 * screen. No word changes. A break never falls inside a quote, and a sentence
 * that leans on the one before it ("For example", "So", "This") stays with it.
 */
const ENOUGH = 180;
const TOO_LONG = 420;
const LEANS_BACK = /^(For example|For instance|Then|So|That|This|These|Those|It|They|He|She|But|Also|Either|To keep)\b/;

export function readableParagraphs(text: string): string[] {
  if (text.length <= ENOUGH + 80 || text.includes("\n")) return [text];
  const sentences = text.split(/(?<=[.?!]["”)]?)\s+(?=[A-Z"“(*])/);
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const open = ((current.match(/["“”]/g) ?? []).length) % 2 === 1;
    const full =
      current.length >= TOO_LONG ||
      (current.length >= ENOUGH && !LEANS_BACK.test(sentence));
    if (current && full && !open) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
