/**
 * ── A LONG LESSON, ONE PART AT A TIME ───────────────────────────────────────
 * A teach block is one markdown string, often 400 to 1,250 words. Read as one
 * scroll it is a wall; the founder approved (program UX review, 2026-11-25)
 * showing it one part per screen, split at the lesson's OWN headings, so no
 * content is rewritten and no new markup is needed.
 *
 * A part starts at a `##` or `###` heading and runs to the next one. Text
 * before the first heading joins the first part. A block with fewer than two
 * headings stays whole, and so does any block with a `{{copyButton}}` marker,
 * because the Copy button's position depends on the text around it.
 */
export interface TeachPart {
  /** The heading text, without the #s. Empty when the part has none. */
  title: string;
  /** The part's markdown, heading included. */
  markdown: string;
}

const HEADING = /^(#{2,3})\s+(.+?)\s*#*\s*$/;

export function teachParts(markdown: string | null | undefined): TeachPart[] {
  if (!markdown) return [];
  const text = markdown.replace(/\r\n/g, "\n");
  if (/\{\{copyButton\}\}/.test(text)) return [{ title: "", markdown: text }];
  const lines = text.split("\n");
  const parts: { title: string; lines: string[] }[] = [];
  let lead: string[] = [];
  for (const line of lines) {
    const h = HEADING.exec(line);
    if (h) {
      parts.push({ title: h[2], lines: parts.length === 0 ? [...lead, line] : [line] });
      lead = [];
    } else if (parts.length === 0) {
      lead.push(line);
    } else {
      parts[parts.length - 1].lines.push(line);
    }
  }
  if (parts.length < 2) return [{ title: parts[0]?.title ?? "", markdown: text }];
  return parts.map((p) => ({ title: p.title, markdown: p.lines.join("\n").trim() }));
}

/** About 200 words a minute, at least one minute. */
export function readMinutes(markdown: string | null | undefined): number {
  const words = (markdown ?? "").replace(/[#*>_`-]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
