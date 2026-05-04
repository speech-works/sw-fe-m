// api/axiosClient.ts
import axios from "axios";
import * as Localization from "expo-localization";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL, X_APP_SECRET } from "./constants";
// import { refreshToken as refreshAccessToken } from "./auth"; // Removed to fix circular dependency
import { isValid, parseISO } from "date-fns";
import { SECURE_KEYS_NAME } from "../constants/secureStorageKeys";
import { EVENT_NAMES } from "../stores/events/constants";
import { getUpdateTokenFn } from "../util/functions/authToken";
import { dispatchCustomEvent } from "../util/functions/events";
import { reviveDatesInObject } from "../util/functions/date";

let isRefreshing = false;
let failedQueue: any[] = [];
let logoutEventDispatched = false;

const shouldDispatchLogoutEvent = async () => {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(SECURE_KEYS_NAME.SW_APP_JWT_KEY),
    SecureStore.getItemAsync(SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY),
  ]);

  return Boolean(accessToken || refreshToken);
};

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Local parsing logic removed in favor of util/functions/date.ts

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "X-App-Secret": X_APP_SECRET,
  },
});

// Request Interceptor
axiosClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync(
      SECURE_KEYS_NAME.SW_APP_JWT_KEY,
    );
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const timezone =
      Localization.getCalendars()?.[0]?.timeZone ||
      (Localization as any).timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (timezone) {
      console.log("axiosClient - Setting X-Client-Timezone:", timezone);
      if (config.headers) {
        config.headers["X-Client-Timezone"] = timezone;
      }
    } else {
      console.warn("axiosClient - Timezone not detected after all fallbacks");
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// function that resets the module-level variable "logoutEventDispatched"
export const resetAuthInterceptor = () => {
  logoutEventDispatched = false;
};

// Response Interceptor
axiosClient.interceptors.response.use(
  (response) => {
    if (response.data?.error) {
      return Promise.reject(
        new Error(`Error from backend: ${response.data.error}`),
      );
    }
    // --- DATE PARSING HERE ---
    // ... existing error handling
    response.data = reviveDatesInObject(response.data);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            const accessToken = token as string;
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync(
          SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY,
        );
        if (!refreshToken) throw new Error("No refresh token found");

        // Use a new axios instance to avoid interceptors
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {
            refreshToken,
          },
          {
            headers: {
              "X-App-Secret": X_APP_SECRET,
            },
          },
        );
        const { token: newAccessToken, error: backendError } =
          refreshResponse.data;

        if (backendError) {
          throw new Error(`Refresh failed: ${backendError}`);
        }

        if (typeof newAccessToken !== "string") {
          console.error(
            "Invalid token received during refresh:",
            newAccessToken,
          );
          throw new Error("Invalid token - expected string JWT.");
        }

        await SecureStore.setItemAsync(
          SECURE_KEYS_NAME.SW_APP_JWT_KEY,
          newAccessToken,
        );

        // ✅ Update React state too (AuthContext)
        const updateTokenFn = getUpdateTokenFn();
        if (updateTokenFn) updateTokenFn(newAccessToken);

        // Reset the logout event flag because we successfully refreshed the token
        logoutEventDispatched = false;

        axiosClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return axiosClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        if (
          !logoutEventDispatched &&
          (await shouldDispatchLogoutEvent())
        ) {
          // so that multiple failed retires don't trigger multiple events
          logoutEventDispatched = true;
          dispatchCustomEvent(EVENT_NAMES.USER_LOGGED_OUT);
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
