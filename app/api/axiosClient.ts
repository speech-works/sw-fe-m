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
import { parseISO, isValid } from "date-fns";

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

// Helper function to convert ISO-like strings to Date objects
// This is the core logic from our previous discussions, adjusted for robustness.
const convertIsoLikeStringToDate = (dateString: string): Date | string => {
  // Regex to extract YYYY-MM-DD HH:mm:ss part
  const match = dateString.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
  if (match && match[1]) {
    // Convert to YYYY-MM-DDTHH:mm:ss for reliable parseISO
    const isoLikeString = match[1].replace(" ", "T");
    const parsedDate = parseISO(isoLikeString);
    // Return the Date object if valid, otherwise return the original string
    return isValid(parsedDate) ? parsedDate : dateString;
  }
  // If it doesn't match our expected format, return the original string
  return dateString;
};

// Recursive function to deeply parse date strings in an object or array
const parseDatesInObject = (obj: any): any => {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => parseDatesInObject(item));
  }

  // Handle plain objects
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      // Check if the value is a string that looks like our expected date format
      // Adjust this regex if your backend might send other date string formats
      if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}( .+)?$/.test(value)
      ) {
        // Attempt to convert the date string, handling the " Timezone Name" part
        newObj[key] = convertIsoLikeStringToDate(value);
      } else if (typeof value === "object") {
        // Recursively process nested objects/arrays
        newObj[key] = parseDatesInObject(value);
      } else {
        // Keep other values as they are
        newObj[key] = value;
      }
    }
  }
  return newObj;
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
      console.log(
        "setting x-client-timezone header:if:",
        Localization.timezone
      );
      config.headers["X-Client-Timezone"] = Localization.timezone;
    } else {
      console.log(
        "setting x-client-timezone header:else:",
        Localization.timezone
      );
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
    // --- DATE PARSING HERE ---
    // ... existing error handling
    response.data = parseDatesInObject(response.data);
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
