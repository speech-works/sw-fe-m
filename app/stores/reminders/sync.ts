/**
 * Which copy of the reminder list wins when this phone and the server
 * disagree (D3, 10 Nov 2026). Before this, reminders lived only on the phone
 * where they were set, so a second phone on the same account had none.
 *
 * Rule: the newest `updatedAt` wins. The one exception is a list made before
 * this update (no `updatedAt` yet): if the server already has a list, the two
 * are joined so neither phone loses what it had.
 *
 * Kept free of native imports so it can be tested on its own, like
 * normalizeDate.ts.
 */

export type SyncDecision =
  | "NONE" // both sides agree, or neither has anything
  | "UPLOAD" // this phone's list is newer, or the server has none yet
  | "ADOPT" // the server's list is newer: take it and reschedule here
  | "MERGE"; // a list from before sync met a server list: join them

export function decideSync(
  local: { count: number; updatedAt: string | null },
  server: { updatedAt: string | null },
): SyncDecision {
  if (server.updatedAt === null) {
    // First run after this update: upload what this phone has so it is kept.
    return local.count > 0 || local.updatedAt !== null ? "UPLOAD" : "NONE";
  }
  if (local.updatedAt === null) {
    return local.count > 0 ? "MERGE" : "ADOPT";
  }
  const l = Date.parse(local.updatedAt);
  const s = Date.parse(server.updatedAt);
  if (Number.isNaN(l)) return "ADOPT";
  if (Number.isNaN(s) || l > s) return "UPLOAD";
  if (s > l) return "ADOPT";
  return "NONE";
}

/** The fields that make two reminders "the same alert" (E4). */
type ReminderShape = {
  id: string;
  category?: string;
  type?: string;
  time?: string;
  date?: string;
  weekDays?: number[];
  title?: string;
};

/**
 * Two reminders are one alert when they would fire at the same moments for
 * the same reason. Template reminders change their title (the message
 * rotates), so the title counts only for custom ones.
 */
export function sameAlertKey(r: ReminderShape): string {
  const days = [...(r.weekDays ?? [])].sort((a, b) => a - b).join(",");
  return [
    r.category ?? "",
    r.type ?? "",
    r.time ?? "",
    r.type === "ONE_TIME" ? r.date ?? "" : "",
    days,
    r.category === "CUSTOM" ? (r.title ?? "").trim().toLowerCase() : "",
  ].join("|");
}

/**
 * Server reminders first, then this phone's own ones it lacks, up to `max`.
 * A phone reminder is skipped when the server has it by id OR has the same
 * alert made on the other phone, so a person who set the same reminder on
 * both phones before sync does not get two alerts (E4, 10 Nov 2026).
 */
export function mergeReminders<T extends ReminderShape>(
  server: T[],
  local: T[],
  max: number,
): T[] {
  const ids = new Set(server.map((r) => r.id));
  const keys = new Set(server.map(sameAlertKey));
  const out = [...server];
  for (const r of local) {
    const key = sameAlertKey(r);
    if (ids.has(r.id) || keys.has(key)) continue;
    ids.add(r.id);
    keys.add(key);
    out.push(r);
  }
  return out.slice(0, max);
}
