// api/axiosClient.ts
import axios from "axios";
import * as Localization from "expo-localization";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "./constants";
import { refreshToken as refreshAccessToken } from "./auth";
import { getUpdateTokenFn } from "../util/functions/authToken";
import { dispatchCustomEvent } from "../util/functions/events";
import { EVENT_NAMES } from "../stores/events/constants";
import { SECURE_KEYS_NAME } from "../constants/secureStorageKeys";
let isRefreshing = false;
let failedQueue: any[] = [];
let logoutEventDispatched = false;

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

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request Interceptor
axiosClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync(
      SECURE_KEYS_NAME.SW_APP_JWT_KEY
    );
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (Localization.timezone) {
      config.headers["X-Client-Timezone"] = Localization.timezone;
    } else {
      config.headers["X-Client-Timezone"] =
        Localization.getCalendars()[0].timeZone;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
axiosClient.interceptors.response.use(
  (response) => {
    if (response.data?.error) {
      return Promise.reject(
        new Error(`Error from backend: ${response.data.error}`)
      );
    }
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
          SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY
        );
        if (!refreshToken) throw new Error("No refresh token found");

        const { token: newAccessToken } = await refreshAccessToken({
          refreshToken,
        });

        await SecureStore.setItemAsync(
          SECURE_KEYS_NAME.SW_APP_JWT_KEY,
          newAccessToken
        );
        // ✅ Update React state too (AuthContext)
        const updateTokenFn = getUpdateTokenFn();
        if (updateTokenFn) updateTokenFn(newAccessToken);

        axiosClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return axiosClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        if (!logoutEventDispatched) {
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
  }
);

export default axiosClient;
