import axiosClient from "../axiosClient";

// login user
interface LoginProps {
  provider: string;
  redirectTo?: string;
}

interface LoginResponse {
  redirectUrl: string;
}
export async function loginUser({
  provider,
  redirectTo,
}: LoginProps): Promise<LoginResponse> {
  try {
    const response = await axiosClient.get(
      `/auth/signin?provider=${provider}&redirectTo=${redirectTo}`,
    );
    console.log("Login response:", response.data);

    const { url } = response.data;
    return { redirectUrl: url };
  } catch (error: any) {
    console.error("There was a problem during login:", error.message);
    console.log("Axios Config URL:", error.config?.url);
    console.log("Axios Base URL:", error.config?.baseURL);
    console.log({ error });
    throw error;
  }
}

/**
 * Exchange the OAuth code for your app’s JWT & user record
 */
export async function handleOAuthCallback(code: string) {
  console.log("handleOAuthCallback called with code:", code);
  try {
    const res = await axiosClient.get(`/auth/callback?code=${code}`);
    console.log("handleOAuthCallback response 1:", res.data);
    return (await res.data) as {
      user: { id: string; email: string; name: string /* … */ };
      appJwt: string;
      refreshToken: string;
    };
  } catch (error: any) {
    console.error(
      "There was a problem during handleOAuthCallback:",
      error.message,
    );
    console.log("Axios Config URL:", error.config?.url);
    console.log("Backend Error Response Data:", error.response?.data);
    throw error;
  }
}

export interface AppleSignInPayload {
  identityToken: string;
  /** The RAW nonce. We hashed it before handing it to Apple; the server needs the raw one. */
  nonce: string;
  /** Apple returns this ONLY on the first-ever authorization for this Apple ID. */
  fullName?: string;
  /**
   * Apple's one-time authorization code, forwarded so the backend can exchange
   * it for a REFRESH token and store it against the user.
   *
   * This exists solely so account deletion can call Apple's revoke endpoint,
   * which Guideline 5.1.1(v) requires of any app offering both Sign in with
   * Apple and in-app account deletion. The identity token we sign in with is
   * not revocable, and `signInWithIdToken` performs no code exchange, so
   * without this the backend has nothing to revoke.
   *
   * Optional on purpose: sign-in must never fail because the code is absent or
   * the exchange breaks.
   */
  authorizationCode?: string;
}

/**
 * Native Sign in with Apple. No redirect, no polling — the device already
 * authorized, and this exchanges the resulting identity token for our session.
 *
 * Deliberately does NOT log its payload: identityToken is a bearer credential.
 */
export async function signInWithApple(payload: AppleSignInPayload) {
  const res = await axiosClient.post("/auth/apple", payload);
  return res.data as {
    user: { id: string; email: string; name: string };
    appJwt: string;
    refreshToken: string;
  };
}

// refresh token
interface RefreshTokenProps {
  refreshToken: string;
}
interface RefreshTokenResponse {
  error: string;
  token: string;
}
export async function refreshToken({
  refreshToken,
}: RefreshTokenProps): Promise<RefreshTokenResponse> {
  try {
    const response = await axiosClient.post("/auth/refresh", {
      refreshToken,
    });
    return response.data;
  } catch (error) {
    console.error("There was a problem during token refresh:", error);
    throw error;
  }
}

// logout user
interface LogoutPayload {
  refreshToken: string;
  appJwt: string;
}
interface LogoutResponse {
  message: string;
}
export async function logoutUser({
  refreshToken,
  appJwt,
}: LogoutPayload): Promise<LogoutResponse> {
  try {
    const response = await axiosClient.post("/auth/logout", {
      appJwt,
      refreshToken,
    });
    console.log("Logout response:", response.data);
    return response.data;
  } catch (error) {
    console.error("There was a problem during logout:", error);
    throw error;
  }
}
