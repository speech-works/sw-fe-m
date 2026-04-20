module.exports = {
  expo: {
    name: "sw-fe-m",
    slug: "sw-fe-m",
    version: "1.0.0",
    sdkVersion: "53.0.0",
    orientation: "portrait",
    icon: "./app/assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    scheme: "speechworks",
    deeplinks: ["auth/callback"],
    platforms: ["ios", "android", "web"],
    splash: {
      image: "./app/assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      bundleIdentifier: "com.mayankav.speechworks",
      supportsTablet: true,
      language: "objective-c",
      infoPlist: {
        NSPhotoLibraryUsageDescription:
          "Allow access to your photo library to upload images.",
        ITSAppUsesNonExemptEncryption: false,
        NSMicrophoneUsageDescription:
          "This app needs microphone access to record your voice.",
        NSCameraUsageDescription:
          "This app needs camera access to record videos.",
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: ["speechworks"],
          },
        ],
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
        },
      },
    },
    android: {
      usesCleartextTraffic: true,
      package: "com.mayankav.speechworks",
      permissions: [
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.RECORD_AUDIO",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.SCHEDULE_EXACT_ALARM",
        "android.permission.POST_NOTIFICATIONS",
      ],
      adaptiveIcon: {
        foregroundImage: "./app/assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      intentFilters: [
        {
          action: "VIEW",
          data: [
            {
              scheme: "speechworks",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      favicon: "./app/assets/favicon.png",
    },
    plugins: [
      [
        "react-native-permissions",
        {
          iosPermissions: ["Microphone", "Camera"],
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission:
            "Allow access to your photo library to upload images.",
          cameraPermission: "Allow access to your camera to take photos.",
        },
      ],
      "expo-font",
      "expo-secure-store",
      "expo-notifications",
      "expo-web-browser",
    ],
    extra: {
      API_BASE_URL: process.env.API_BASE_URL,
      X_APP_SECRET: process.env.X_APP_SECRET,
      PAYMENTS_ENABLED: process.env.PAYMENTS_ENABLED ?? "false",
      eas: {
        projectId: "da01d434-2a75-41bb-b7cc-19fd2f720aa5",
      },
    },
    owner: "mayankav",
  },
};
