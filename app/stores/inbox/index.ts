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
}

export const useInboxStore = create<InboxState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n || 0) }),
  clearUnread: () => set({ unreadCount: 0 }),
  hasBuddy: null,
  setHasBuddy: (v) => set({ hasBuddy: v }),
}));

