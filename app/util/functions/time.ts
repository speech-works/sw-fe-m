/**
 * "Mar 2026" — a coarse joined-at line.
 *
 * Month precision on purpose wherever it describes a PERSON rather than an
 * event: how long someone has been here is context, and an exact date is a
 * detail about a stranger that nobody asked to publish.
 */
export const monthYear = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : null;

/**
 * "just now" / "3h ago" / "yesterday" / "4d ago", then a plain date.
 *
 * Never finer than an hour. Minute-level precision on someone else's activity
 * reads as surveillance, and it is not information anyone acts on.
 */
export const relativeAgo = (d?: string | Date | null): string | null => {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 60) return "just now";
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
};

export const formatDuration = (minutes: number | undefined): string => {
  if (minutes === undefined || isNaN(minutes)) return "0m";

  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  } else if (minutes < 1440) {
    // less than 24 hours
    const hours = minutes / 60;
    return `${Math.round(hours)}h`;
  } else {
    const days = minutes / 1440;
    return `${Math.round(days)}d`;
  }
};
