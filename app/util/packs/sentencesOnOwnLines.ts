/**
 * Puts each sentence of a one-block text in its own paragraph, so a long
 * instruction reads as short lines. No word changes. Text that already has line
 * breaks or a list has its own layout and is left alone.
 *
 * A quotation stays in one piece: a sentence end inside open double quotes is
 * not a break, so an example like "I asked for tea. I wanted coffee." is not
 * split across two paragraphs.
 */
export function sentencesOnOwnLines(text: string): string {
  if (!text || text.includes("\n")) return text;
  return text.replace(
    /([.?!]["”]?)\s+(?=[A-Z"“])/g,
    (match: string, end: string, offset: number) =>
      insideQuote(text.slice(0, offset + end.length)) ? match : `${end}\n\n`,
  );
}

/** True when the text before this point leaves a double quote open. */
function insideQuote(before: string): boolean {
  const straight = (before.match(/"/g) || []).length;
  const opened = (before.match(/“/g) || []).length;
  const closed = (before.match(/”/g) || []).length;
  return straight % 2 === 1 || opened > closed;
}
