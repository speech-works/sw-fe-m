// api/devices/index.ts
//
// Expo push-token registration. The token is stored server-side (users.expo_push_tokens) so the
// backend can deliver buddy pushes. PII — never log or send tokens to analytics.
import axios from "axios";
import axiosClient from "../axiosClient";
import { API_BASE_URL } from "../constants";

/** Register an Expo push token for the current user. */
export async function registerPushToken(token: string): Promise<void> {
  try {
    await axiosClient.post("/devices", { token });
  } catch (error) {
    console.error("Error registering push token:", error);
    throw error;
  }
}

/**
 * Remove a push token as the user whose JWT this is, without axiosClient (on
 * sign-out the local session is already cleared; see logoutUserDetached for
 * why the interceptors must not run). Throws on failure.
 */
export async function removePushTokenDetached(
  token: string,
  appJwt: string,
): Promise<void> {
  await axios.delete(`${API_BASE_URL}/devices/${encodeURIComponent(token)}`, {
    headers: { Authorization: `Bearer ${appJwt}` },
    timeout: 10000,
  });
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
