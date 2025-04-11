// api/auth.ts (or similar file)
import axiosClient from "../axiosClient";
import * as SecureStore from "expo-secure-store";

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
  password: string;
  email: string;
}

interface LoginResponse {
  token: string;
  refreshToken: string;
}
export async function loginUser({
  email,
  password,
}: LoginProps): Promise<LoginResponse> {
  try {
    const response = await axiosClient.post("/auth/login", {
      email,
      password,
    });
    const { token, refreshToken } = response.data;
    console.log("login user called before storing tokens", {
      token,
      refreshToken,
    });

    // Securely store tokens for later use:
    if (token) {
      await SecureStore.setItemAsync("accessToken", token);
    }
    if (refreshToken) {
      await SecureStore.setItemAsync("refreshToken", refreshToken);
    }
    return response.data;
  } catch (error) {
    console.error("There was a problem during login:", error);
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
    const response = await axiosClient.post("/auth/refresh-token", {
      refreshToken,
    });
    return response.data;
  } catch (error) {
    console.error("There was a problem during token refresh:", error);
    throw error;
  }
}

// logout user
interface LogoutProps {
  refreshToken: string;
  accessToken: string;
}
interface LogoutResponse {
  message: string;
}
export async function logoutUser({
  refreshToken,
  accessToken,
}: LogoutProps): Promise<LogoutResponse> {
  try {
    const response = await axiosClient.post("/auth/logout", {
      accessToken,
      refreshToken,
    });
    return response.data;
  } catch (error) {
    console.error("There was a problem during logout:", error);
    throw error;
  }
}
