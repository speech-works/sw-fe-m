import { API_BASE_URL } from "../constants";
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
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, password, email }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
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
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const resJson = await response.json();
    const { token, refreshToken } = resJson;
    console.log("login user called before storing tokens", {
      token,
      refreshToken,
    });
    // Securely store them for later use:
    if (token) {
      await SecureStore.setItemAsync("accessToken", token);
    }
    if (refreshToken) {
      await SecureStore.setItemAsync("refreshToken", refreshToken);
    }
    return resJson;
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    throw error;
  }
}

//refresh token
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
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    throw error;
  }
}

//logout user
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
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accessToken, refreshToken }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const resJson = await response.json();
    return resJson;
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    throw error;
  }
}
