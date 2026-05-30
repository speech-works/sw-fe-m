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
      package: "com.mayankav.speechworks",
      permissions: [
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.RECORD_AUDIO",
        "android.permission.CAMERA",
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
    ],
    extra: {
      API_BASE_URL: process.env.API_BASE_URL,
      X_APP_SECRET: process.env.X_APP_SECRET,
      PAYMENTS_ENABLED: process.env.PAYMENTS_ENABLED ?? "false",
      ALLOW_SIMULATOR_HEADSET_BYPASS:
        process.env.ALLOW_SIMULATOR_HEADSET_BYPASS ?? "false",
      eas: {
        projectId: "da01d434-2a75-41bb-b7cc-19fd2f720aa5",
      },
    },
    owner: "mayankav",
  },
};
