const { withGradleProperties } = require("@expo/config-plugins");
const withMediaPipeDuplicateFix = require("./plugins/withMediaPipeDuplicateFix");

const apiBaseUrl = process.env.API_BASE_URL || "";
const allowsInsecureNetworkTraffic =
  /^http:\/\//i.test(apiBaseUrl) || /^ws:\/\//i.test(apiBaseUrl);

const withCustomJvmArgs = (config) => {
  return withGradleProperties(config, (config) => {
    const property = config.modResults.find((p) => p.key === "org.gradle.jvmargs");
    const newArgs = "-Xmx4096m -XX:MaxMetaspaceSize=1024m";
    if (property) {
      property.value = newArgs;
    } else {
      config.modResults.push({ type: "property", key: "org.gradle.jvmargs", value: newArgs });
    }
    return config;
  });
};

module.exports = {
  expo: {
    name: "Speechworks",
    slug: "sw-fe-m",
    version: "1.0.1",
    sdkVersion: "53.0.0",
    // Over-the-air updates (EAS Update): lets us ship JS-only fixes without a
    // Play Store rebuild + review. `runtimeVersion` uses the "appVersion"
    // policy, so an OTA update only reaches builds whose `version` matches —
    // bump `version` and do a full rebuild whenever native code/deps change.
    updates: {
      url: "https://u.expo.dev/da01d434-2a75-41bb-b7cc-19fd2f720aa5",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    orientation: "portrait",
    icon: "./app/assets/icon.png",
    // "automatic" lets iOS/Android report the real device appearance so the
    // in-app Light/Dark/System preference can follow it (System mode reads
    // useColorScheme()). Requires expo-system-ui on Android. Native change —
    // needs a rebuild, not OTA-able.
    userInterfaceStyle: "automatic",
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
      bundleIdentifier: "com.speechworks.app",
      supportsTablet: true,
      language: "objective-c",
      // Apple Privacy Manifest — declares the data the app collects.
      // (Expo auto-generates NSPrivacyAccessedAPITypes for linked modules;
      // collected-data types must be declared explicitly here.)
      // Keep aligned with the Play Data-Safety form + App Store nutrition label.
      privacyManifests: {
        NSPrivacyCollectedDataTypes: [
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeAudioData",
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeEmailAddress",
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeName",
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePhoneNumber",
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeUserID",
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
          {
            NSPrivacyCollectedDataType:
              "NSPrivacyCollectedDataTypeProductInteraction",
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAnalytics",
            ],
          },
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeCrashData",
            NSPrivacyCollectedDataTypeLinked: false,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
          {
            NSPrivacyCollectedDataType:
              "NSPrivacyCollectedDataTypePerformanceData",
            NSPrivacyCollectedDataTypeLinked: false,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
        ],
      },
      infoPlist: {
        NSPhotoLibraryUsageDescription:
          "Allow access to your photo library to upload images.",
        ITSAppUsesNonExemptEncryption: false,
        NSMicrophoneUsageDescription:
          "This app needs microphone access to record your voice.",
        NSCameraUsageDescription:
          "This app needs camera access to record videos.",
        NSMotionUsageDescription:
          "This app uses motion data to tell your head movements apart from phone movement during awareness exercises.",
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: ["speechworks"],
          },
        ],
        ...(allowsInsecureNetworkTraffic
          ? {
            NSAppTransportSecurity: {
              NSAllowsArbitraryLoads: true,
            },
          }
          : {}),
      },
    },
    android: {
      usesCleartextTraffic: allowsInsecureNetworkTraffic,
      package: "com.speechworks.app",
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.CAMERA",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.POST_NOTIFICATIONS",
      ],
      // React Native's debug manifest injects SYSTEM_ALERT_WINDOW; the app uses
      // no draw-over-other-apps overlay, so strip it from the release manifest
      // (avoids an unnecessary sensitive-permission flag on the stores).
      blockedPermissions: ["android.permission.SYSTEM_ALERT_WINDOW", "android.permission.ACTIVITY_RECOGNITION"],
      adaptiveIcon: {
        foregroundImage: "./app/assets/adaptive-icon.png",
        backgroundColor: "#592D1C",
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
      withCustomJvmArgs,
      withMediaPipeDuplicateFix,
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
      [
        "expo-speech-recognition",
        {
          "microphonePermission": "SpeechWorks needs your microphone for awareness exercises.",
          "speechRecognitionPermission": "SpeechWorks uses speech recognition to analyze speech patterns during exercises."
        }
      ],
      [
        "react-native-vision-camera",
        {
          cameraPermissionText: "SpeechWorks uses your camera for on-device body awareness exercises. No video is recorded or sent anywhere.",
          enableCodeScanner: false,
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            minSdkVersion: 26,
          },
          ios: {
            deploymentTarget: "16.4",
          },
        },
      ],
      [
        "@sentry/react-native/expo",
        {
          organization: process.env.SENTRY_ORG ?? "speechworks",
          // TODO: confirm the exact Sentry project slug (org: speechworks).
          project: process.env.SENTRY_PROJECT ?? "react-native",
          // SENTRY_AUTH_TOKEN (build-time, for source-map upload) is read from
          // the environment — set it as an EAS secret, never commit it.
        },
      ],
    ],
    extra: {
      API_BASE_URL: process.env.API_BASE_URL,
      PAYMENTS_ENABLED: process.env.PAYMENTS_ENABLED ?? "false",
      ALLOW_SIMULATOR_HEADSET_BYPASS:
        process.env.ALLOW_SIMULATOR_HEADSET_BYPASS ?? "false",
      // RevenueCat public SDK keys (PAYMENTS-PLAN.md) — safe to expose
      // client-side (they're publishable keys, not secrets). Empty until the
      // founder creates the RevenueCat project and Play/App Store apps.
      REVENUECAT_ANDROID_API_KEY: process.env.REVENUECAT_ANDROID_API_KEY ?? "",
      REVENUECAT_IOS_API_KEY: process.env.REVENUECAT_IOS_API_KEY ?? "",
      eas: {
        projectId: "da01d434-2a75-41bb-b7cc-19fd2f720aa5",
      },
    },
    owner: "mayankav",
  },
};
