/**
 * Sign out at once; tell the server in the background.
 *
 * Log Out used to wait on the network before signing out: Settings awaited
 * POST /auth/logout, then AuthContext.logout() awaited the push-token removal
 * and POST /auth/logout AGAIN. On a real phone nothing happened for about
 * 2.5 s after the tap, and the server was told twice (founder, 9 Nov 2026).
 *
 * Now AuthContext.logout() runs this, once:
 *  1. read what the server calls need (JWT, refresh token, push token) BEFORE
 *     anything is cleared, because the clear deletes all three;
 *  2. start the server calls in the background: remove this device's push
 *     token, then revoke the session. Never awaited, errors caught and logged;
 *  3. clear the local session, which is the only thing the caller waits for.
 */
export interface SignOutSecrets {
  appJwt: string | null;
  refreshToken: string | null;
  pushToken: string | null;
}

export interface SignOutDeps {
  /** Read before the clear. Anything unreadable is null. */
  readSecrets: () => Promise<SignOutSecrets>;
  /** The local sign-out: SecureStore, user state, analytics, RevenueCat. */
  clearSession: () => Promise<void>;
  /** DELETE /devices/{token}, as this JWT's user. */
  removePushToken: (pushToken: string, appJwt: string) => Promise<unknown>;
  /** POST /auth/logout. */
  revokeSession: (payload: { refreshToken: string; appJwt: string }) => Promise<unknown>;
}

/** The server half, in order. Never rejects. */
export async function tellServerSignedOut(
  { appJwt, refreshToken, pushToken }: SignOutSecrets,
  deps: Pick<SignOutDeps, "removePushToken" | "revokeSession">,
): Promise<void> {
  if (!appJwt) return;
  // The push token first, while the JWT is surely still accepted.
  if (pushToken) {
    try {
      await deps.removePushToken(pushToken, appJwt);
    } catch (error) {
      console.warn("[signOut] push token removal failed (signed out locally):", error);
    }
  }
  if (refreshToken) {
    try {
      await deps.revokeSession({ refreshToken, appJwt });
    } catch (error) {
      console.warn("[signOut] server logout failed (signed out locally):", error);
    }
  }
}

export async function signOutNow(deps: SignOutDeps): Promise<void> {
  let secrets: SignOutSecrets = { appJwt: null, refreshToken: null, pushToken: null };
  try {
    secrets = await deps.readSecrets();
  } catch (error) {
    // Unreadable secrets only cost the server calls. Sign out anyway.
    console.warn("[signOut] could not read tokens, signing out anyway:", error);
  }
  // Background: started now, never awaited by the tap.
  void tellServerSignedOut(secrets, deps);
  await deps.clearSession();
}
