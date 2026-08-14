/** Zero-width space: an invisible, zero-metric legal line-break opportunity. */
const ZWSP = "\u200B";

/**
 * Let a long unbroken token (an email, a URL, a handle) wrap at its SEAMS.
 *
 * An email is one token to the layout engine (there is no space in it), so
 * when it outgrows its column the engine falls back to breaking by CHARACTER
 * and you get `…@gmail.c / om`, which reads as a rendering bug rather than as a
 * wrapped address. RN has no `overflow-wrap: break-word` to reach for, so we
 * give the engine break opportunities where a human would put them: before the
 * `@`, and after the dots that precede it.
 *
 * The domain deliberately gets NONE. The engine breaks at the LAST opportunity
 * that fits, so a break point inside `gmail.com` would beat the `@` whenever
 * the column happened to be a few points wider, leaving `…@gmail.` / `com`,
 * which is the same ugly break one character further along. Keeping the domain
 * whole makes the `@` the only place it can land.
 *
 * Zero-width spaces are invisible, add no width, are ignored by screen readers,
 * and only mark where a break is ALLOWED. Short values are untouched. Display
 * only: never feed the result back to the API or into a `mailto:`.
 */
export const withWrapPoints = (value: string): string => {
  const at = value.indexOf("@");
  // No `@`: a URL or a handle. Dots are the only seam it has.
  if (at === -1) return value.replace(/\.(?=\S)/g, `.${ZWSP}`);
  const local = value.slice(0, at).replace(/\.(?=\S)/g, `.${ZWSP}`);
  return `${local}${ZWSP}${value.slice(at)}`;
};

export const toPascalCase = (str: string) => {
  if (!str) return;
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[a-z]/, (m) => m.toUpperCase());
};
