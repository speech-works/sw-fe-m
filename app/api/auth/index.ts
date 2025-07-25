import axiosClient from "../axiosClient";

// register user
interface RegisterProps {
  name: string;
  password: string;
  email: string;
}

interface RegisterResponse {
  id: string;
}

export async function registerUser({
  name,
  password,
  email,
}: RegisterProps): Promise<RegisterResponse> {
  try {
    const response = await axiosClient.post("/auth/register", {
      name,
      password,
      email,
    });
    return response.data;
  } catch (error) {
    console.error("There was a problem during user registration:", error);
    throw error;
  }
}

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
      `/auth/signin?provider=${provider}&redirectTo=${redirectTo}`
    );
    console.log("Login response:", response.data);

    const { url } = response.data;
    return { redirectUrl: url };
  } catch (error) {
    console.error("There was a problem during login:", error);
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
  } catch (error) {
    console.error("There was a problem during handleOAuthCallback:", error);
    throw error;
  }
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
