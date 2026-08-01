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
    // Splash = the flash the OS shows before any of our JS runs. The background
    // is the app's own dark canvas (palette ink.canvas), NOT white: a white
    // splash handing off to a dark first screen is a visible flash of the wrong
    // app. The mark is white for the same reason the background is dark — the
    // black-transparent logo variant would be invisible on #141311.
    splash: {
      image: "./app/assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#141311",
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
      // Registers the app with Firebase Cloud Messaging, which is the ONLY
      // route push can take to an Android device. Without it Firebase never
      // initializes, getExpoPushTokenAsync() throws, and the device silently
      // never obtains a token — so the server has nothing to send to and every
      // Android user receives nothing, with no error anywhere.
      // iOS needs no equivalent: Apple's APNs key is managed by EAS.
      googleServicesFile: "./google-services.json",
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
      // The icon is `svg logos/sw-icon-white.svg`. iOS and web take that file
      // whole; Android can't, because the launcher masks the icon to its own
      // shape (circle, squircle, teardrop) and only the middle 72dp of the 108dp
      // canvas survives. So the design is split across the two adaptive layers:
      // the warm field as the background IMAGE, the mark ALONE as the
      // foreground. The design's inset glass tile is dropped — the launcher's
      // mask is that shape now, and an inner rounded rect sitting inside a
      // circle mask reads as a stray box.
      // The mark is drawn at 465px, the same 68% of the masked-in area that it
      // occupies of the tile in the source file. It is NOT drawn to the canvas
      // edges: a full-bleed foreground is the one thing this layer cannot be —
      // the mask cuts its sides off and the star's negative space turns into a
      // hole punched through to the background.
      // `backgroundColor` mirrors the design's base colour and stays below as
      // the fallback for launchers that ignore backgroundImage.
      // `monochromeImage` is the silhouette Android tints from the user's
      // wallpaper when "Themed icons" is on. It is not optional any more: from
      // Android 16 QPR2 the system auto-derives one for apps that don't ship it,
      // and an auto-derived mark comes out muddy. Shipping our own keeps the
      // star's negative space readable when tinted — so it is the mark at the
      // same size, never an inverted plate.
      adaptiveIcon: {
        foregroundImage: "./app/assets/adaptive-icon.png",
        backgroundImage: "./app/assets/adaptive-icon-bg.png",
        monochromeImage: "./app/assets/adaptive-icon-mono.png",
        backgroundColor: "#141311",
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
          // Confirmed against the Sentry org directly (2026-07-29) — the
          // fallbacks are the real values, not placeholders. SENTRY_ORG /
          // SENTRY_PROJECT / SENTRY_AUTH_TOKEN are also set as EAS project
          // env vars for production, which is what an actual build reads;
          // these defaults only cover a local `expo prebuild` run outside EAS.
          organization: process.env.SENTRY_ORG ?? "speechworks",
          project: process.env.SENTRY_PROJECT ?? "react-native",
          // SENTRY_AUTH_TOKEN (build-time, for source-map upload) is read from
          // the environment — set it as an EAS secret, never commit it.
        },
      ],
    ],
    extra: {
      API_BASE_URL: process.env.API_BASE_URL,
      PAYMENTS_ENABLED: process.env.PAYMENTS_ENABLED ?? "false",
      // Ask the first five onboarding questions BEFORE an account exists, so
      // the signup step unlocks a plan instead of guarding one. Defaults ON;
      // set to "false" to fall straight back to the login-first flow without
      // shipping a new build (it is read at runtime, not compiled away).
      PRE_AUTH_ONBOARDING_ENABLED:
        process.env.PRE_AUTH_ONBOARDING_ENABLED ?? "true",
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
