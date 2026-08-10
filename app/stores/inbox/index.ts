import { create } from "zustand";

/**
 * Ephemeral unread state for buddy-thread activity, used by the Community tab badge.
 * Refreshed from the server (`Thread.unreadCount`) on app foreground / Community load, and
 * cleared when the timeline is viewed (markThreadRead). Not persisted.
 */
interface InboxState {
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  clearUnread: () => void;
  /** Whether the user currently has an active buddy connection. Drives the dot-only badge. */
  hasBuddy: boolean | null; // null = not yet determined
  setHasBuddy: (v: boolean) => void;
  /**
   * Incoming buddy requests awaiting an answer.
   *
   * Deliberately SEPARATE from `unreadCount` rather than added into it. Two
   * reasons: viewing the timeline calls `clearUnread()`, which would wrongly
   * zero pending requests as a side effect; and the tab badge's accessibility
   * label says "N unread", which is false for something that isn't a message.
   */
  pendingRequestCount: number;
  setPendingRequestCount: (n: number) => void;
}

export const useInboxStore = create<InboxState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n || 0) }),
  clearUnread: () => set({ unreadCount: 0 }),
  hasBuddy: null,
  setHasBuddy: (v) => set({ hasBuddy: v }),
  pendingRequestCount: 0,
  setPendingRequestCount: (n) => set({ pendingRequestCount: Math.max(0, n || 0) }),
}));

