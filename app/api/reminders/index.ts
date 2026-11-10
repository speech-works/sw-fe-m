// api/reminders/index.ts
//
// The Settings > Reminders list kept on the server, so every phone on the
// account gets it (D3, 10 Nov 2026). Notification ids are device-only and are
// never sent.
import axiosClient from "../axiosClient";

export interface SyncedReminder {
  id: string;
  title: string;
  body?: string;
  category: string;
  type: "ONE_TIME" | "ROUTINE";
  date: string;
  time: string;
  weekDays?: number[];
  active: boolean;
  createdAt: string;
  messageIndex?: number;
}

export interface ServerReminderList {
  reminders: SyncedReminder[];
  /** ISO time of the last change, or null when this account never saved one. */
  updatedAt: string | null;
  /** On a save: false when the server already held a newer list (returned here). */
  applied?: boolean;
}

/**
 * axiosClient turns date-like strings into Date objects. A reminder's `date`
 * is a calendar day and the store compares strings, so turn them back here
 * (D3, 10 Nov 2026). parseISO reads "YYYY-MM-DD" as LOCAL midnight, so the
 * local fields give back the same day.
 */
function dayString(v: unknown): string {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
  }
  return typeof v === "string" ? v : "";
}

function isoString(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  return typeof v === "string" ? v : null;
}

export function fromWire(data: any): ServerReminderList {
  const list: any[] = Array.isArray(data?.reminders) ? data.reminders : [];
  return {
    reminders: list.map((r) => ({
      ...r,
      date: dayString(r.date),
      time: typeof r.time === "string" ? r.time : String(r.time ?? ""),
      createdAt: isoString(r.createdAt) ?? new Date().toISOString(),
    })),
    updatedAt: isoString(data?.updatedAt),
    applied: data?.applied,
  };
}

export async function getServerReminders(): Promise<ServerReminderList> {
  const { data } = await axiosClient.get("/reminders");
  return fromWire(data);
}

export async function putServerReminders(
  reminders: SyncedReminder[],
  updatedAt: string,
): Promise<ServerReminderList> {
  const { data } = await axiosClient.put("/reminders", {
    reminders,
    updatedAt,
  });
  return fromWire(data);
}
