import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

// Android emulators need 10.0.2.2 to access host machine
// iOS simulators can use the WiFi IP directly
const getApiBaseUrl = () => {
  const configuredUrl = Constants.expoConfig?.extra?.API_BASE_URL;

  // If running on Android emulator in development
  if (Platform.OS === "android" && __DEV__) {
    const isEmulator =
      !Device.isDevice ||
      (Device.modelName &&
        (Device.modelName.includes("Emulator") ||
          Device.modelName.includes("sdk") ||
          Device.modelName.includes("Medium_Phone") ||
          Device.modelName.includes("gphone")));

    // Replace localhost or 192.168.x.x with 10.0.2.2 for Android emulator
    if (isEmulator && configuredUrl) {
      return configuredUrl
        .replace("localhost", "10.0.2.2")
        .replace(/192\.168\.\d+\.\d+/, "10.0.2.2");
    }
  }

  return configuredUrl;
};

export const API_BASE_URL = getApiBaseUrl();
export const X_APP_SECRET = Constants.expoConfig?.extra?.X_APP_SECRET;

console.log(
  `[API] Using API_BASE_URL: ${API_BASE_URL} (Platform: ${Platform.OS}, Dev: ${__DEV__})`,
);
