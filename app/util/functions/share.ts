// share.ts
import { Share } from "react-native";

const APP_SCHEME = "speechworks";

/**
 * Neutral, stigma-safe invite message. Deliberately never names the condition —
 * the user decides what to disclose. Includes the code plus an in-app deep link
 * (works for people who already have the app; new installs type the code by hand).
 */
export function buildBuddyInviteMessage(code: string): string {
  return (
    `Practice with me on Speechworks 🦋\n\n` +
    `Use my invite code ${code} when you sign up and we'll be practice buddies: ` +
    `${APP_SCHEME}://r/${code}`
  );
}

/**
 * Opens the OS share sheet with the buddy invite.
 * Returns true if the user actually shared (not dismissed), so callers can
 * fire the BUDDY_INVITE_SHARED analytics event on success.
 */
export async function shareBuddyInvite(code: string): Promise<boolean> {
  try {
    const result = await Share.share({ message: buildBuddyInviteMessage(code) });
    return result.action === Share.sharedAction;
  } catch (error) {
    console.error("Error sharing buddy invite:", error);
    return false;
  }
}
