import { useInboxStore } from "../../stores/inbox";

/**
 * Everything that must be forgotten the moment a pairing ends — whether you
 * blocked them, left, or they left you.
 *
 * One function rather than two lines at each call site, because the failure
 * mode here is remembering half of it: `setHasBuddy(false)` was already being
 * called on some paths while `clearUnread()` was called on none, so the
 * Community tab kept a live unread badge pointing at a thread the user had just
 * severed. It only cleared on the next successful `getThread()`, which after an
 * unpair never comes.
 *
 * Deliberately does NOT touch the Timeline's in-memory signals: that list is
 * keyed on the thread and unmounts with it, and a re-pair produces a brand new
 * threadId, so there is nothing stale to clear.
 */
export function resetBuddyLocalState(): void {
  const inbox = useInboxStore.getState();
  inbox.setHasBuddy(false);
  inbox.clearUnread();
}
