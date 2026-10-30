/**
 * Normalise a session title for the timeline: strip a leading "Day 3:" /
 * "Module 3:" (the node owns the number) and quotes that wrap the WHOLE title,
 * so a title that quotes a question ("Tell me about yourself") reads as a
 * heading like every other day. Quotes around a word inside a title stay:
 * Saying "No" keeps both. Display-only, the raw server title is untouched.
 */
export const cleanTitle = (t: string) =>
  t
    .replace(/^(?:Day|Module|Session)\s*\d+\s*[:.\-–—]\s*/i, "")
    .trim()
    .replace(/^[“"]([^“”"]*)[”"]$/, "$1")
    .trim();
