// api/devices/index.ts
//
// Expo push-token registration. The token is stored server-side (users.expo_push_tokens) so the
// backend can deliver buddy pushes. PII — never log or send tokens to analytics.
import axiosClient from "../axiosClient";

/** Register an Expo push token for the current user. */
export async function registerPushToken(token: string): Promise<void> {
  try {
    await axiosClient.post("/devices", { token });
  } catch (error) {
    console.error("Error registering push token:", error);
    throw error;
  }
}

/** Remove a push token (on logout / token rotation). */
export async function removePushToken(token: string): Promise<void> {
  try {
    await axiosClient.delete(`/devices/${encodeURIComponent(token)}`);
  } catch (error) {
    console.error("Error removing push token:", error);
    throw error;
  }
}
