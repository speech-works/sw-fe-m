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
}

export const useInboxStore = create<InboxState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n || 0) }),
  clearUnread: () => set({ unreadCount: 0 }),
}));
