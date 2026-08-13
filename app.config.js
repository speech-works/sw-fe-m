const { withGradleProperties } = require("@expo/config-plugins");
const withMediaPipeDuplicateFix = require("./plugins/withMediaPipeDuplicateFix");
const withAndroid16Compat = require("./plugins/withAndroid16Compat");
const withAndroidLegacyIcon = require("./plugins/withAndroidLegacyIcon");

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

/**
 * AGP 8.8.2 (pinned by RN 0.79's version catalog) predates compileSdk 36 and
 * warns twice per build that it was "tested up to compileSdk = 35". Verified on
 * 2026-08-03 that this is WARNINGS ONLY — the build succeeds without it — so
 * this is log hygiene, not a requirement. Delete it when the toolchain reaches
 * AGP 8.9.1+, which is where the warning goes away on its own.
 */
const withSuppressCompileSdkWarning = (config) => {
  return withGradleProperties(config, (config) => {
    const key = "android.suppressUnsupportedCompileSdk";
    const property = config.modResults.find((p) => p.key === key);
    if (property) {
      property.value = "36";
    } else {
      config.modResults.push({ type: "property", key, value: "36" });
    }
    return config;
  });
};

module.exports = {
  expo: {
    name: "Speechworks",
    slug: "sw-fe-m",
    version: "1.0.2",
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
    // Canonical 1024px, opaque, full-bleed store icon, rendered from
    // `svg logos/sw-icon.svg` by scripts/build-logo-assets.mjs. Square on
    // purpose: iOS applies its own corner mask and App Store Connect rejects an
    // icon that carries an alpha channel, so the tile is composited onto solid
    // ink at render time. Regenerate with `npm run logos:build`, never by hand.
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
    // Splash = the flash the OS shows before any of our JS runs, so it cannot
    // read the in-app appearance preference — the OS picks it from the DEVICE
    // appearance. It therefore ships as a PAIR.
    //
    // The rule has always been "the splash must match the first screen, or the
    // handoff is a visible flash of the wrong app". That was satisfied while
    // dark was the only scheme. Once Appearance became a user preference, the
    // single near-black splash started producing exactly the flash it exists to
    // prevent, inverted: ink, then cream. The pair below is the same mark in
    // each scheme's own ground — white on `ink.canvas`, ink on `paper.canvas`.
    //
    // Top level = the LIGHT default; `ios/android.splash.dark` overrides it on a
    // dark device. The top-level key is kept in sync with both so no platform
    // can silently fall back to a splash the other two do not use.
    //
    // Not covered, deliberately: a user whose in-app preference DISAGREES with
    // their device (app set to Light on a dark phone). Fixing that means writing
    // the preference into native prefs at boot and reading it before the JS
    // bundle loads. It is a real follow-up, not something this pair can do.
    splash: {
      image: "./app/assets/splash-icon-light.png",
      resizeMode: "contain",
      backgroundColor: "#F7F2EA",
    },
    ios: {
      // See the top-level `splash` note: light default, dark override.
      splash: {
        image: "./app/assets/splash-icon-light.png",
        resizeMode: "contain",
        backgroundColor: "#F7F2EA",
        dark: {
          image: "./app/assets/splash-icon.png",
          resizeMode: "contain",
          backgroundColor: "#141311",
        },
      },
      bundleIdentifier: "com.speechworks.app",
      // Explicit even though the top-level icon already applies to iOS, so the
      // App Store source cannot silently diverge if another platform changes.
      icon: "./app/assets/icon.png",
      // iPhone only. Every screen is designed portrait-first at phone widths,
      // and declaring iPad support means App Review opens the app on an iPad
      // and requires a separate 13" screenshot set for a layout we have never
      // tested. The app still runs on iPad in iPhone compatibility mode. Flip
      // this on when iPad layouts are a feature we've actually built.
      supportsTablet: false,
      // Generates the com.apple.developer.applesignin entitlement. Needed as
      // well as the plugin entry below: without this you get a native module
      // that fails at signInAsync; without the plugin you get an entitlement
      // with no module behind it.
      usesAppleSignIn: true,
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
          // Health. Apple's definition includes "any other user provided health
          // or medical data", which covers the onboarding answers about how
          // speaking feels, the mood check-ins, and the self-rated effort and
          // autonomy scores in app/utils/vitals.ts. None of it is HealthKit,
          // but it is health-adjacent and was undeclared. Under-declaring is
          // the expensive mistake here, not over-declaring.
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeHealth",
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
          // Other User Content. Free text that reaches another human: the
          // practice-share caption, and the display name (user-editable, and it
          // renders in the buddy's push notifications).
          {
            NSPrivacyCollectedDataType:
              "NSPrivacyCollectedDataTypeOtherUserContent",
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
        ],
      },
      infoPlist: {
        // These three are ALSO written by config plugins (expo-image-picker,
        // react-native-vision-camera, expo-speech-recognition), and the plugin
        // wins the merge. They are kept identical here so the built plist is
        // correct whichever source lands last. "This app needs camera access to
        // record videos" was never true — we never record video.
        NSPhotoLibraryUsageDescription:
          "Speechworks uses your photo library so you can choose a profile photo.",
        ITSAppUsesNonExemptEncryption: false,
        NSMicrophoneUsageDescription:
          "Speechworks uses your microphone for recording practice and live calls.",
        NSCameraUsageDescription:
          "Speechworks uses your camera for on-device awareness exercises, and to take a profile photo. No video is recorded or sent.",
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
      // See the top-level `splash` note: light default, dark override.
      splash: {
        image: "./app/assets/splash-icon-light.png",
        resizeMode: "contain",
        backgroundColor: "#F7F2EA",
        dark: {
          image: "./app/assets/splash-icon.png",
          resizeMode: "contain",
          backgroundColor: "#141311",
        },
      },
      // Android 16 IGNORES `windowOptOutEdgeToEdgeEnforcement` at target 36, so
      // bumping targetSdk would otherwise flip the app's entire layout model in
      // the same action. Enabling it here, deliberately, at target 35 decouples
      // the two: this is provable and revertable on its own, and the later
      // targetSdk bump then changes almost nothing.
      // Rollback for the whole edge-to-edge migration is this one boolean.
      // See docs/android-16-target-sdk-plan.md.
      edgeToEdgeEnabled: true,
      usesCleartextTraffic: allowsInsecureNetworkTraffic,
      package: "com.speechworks.app",
      // Combined icon for legacy launchers. Google Play's 512px store-listing
      // icon is app/assets/play-store-icon.png and is uploaded in Play Console.
      icon: "./app/assets/icon.png",
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
      // Adaptive icons override both expo.icon and android.icon. The foreground
      // is the same tile as the iOS icon, pre-shrunk into the 72/108 viewport a
      // launcher actually reveals, so Android and both stores share one
      // identity; launchers apply their own circle/squircle mask.
      // `backgroundColor` and `backgroundImage` stay underneath as fallbacks.
      // `monochromeImage` is the silhouette Android tints from the user's
      // wallpaper when "Themed icons" is on. It is not optional any more: from
      // Android 16 QPR2 the system auto-derives one for apps that don't ship it,
      // and an auto-derived mark comes out muddy. Shipping our own keeps the
      // transparent negative space readable when tinted.
      adaptiveIcon: {
        // The foreground already fills the whole 72dp viewport a launcher mask
        // reveals, so a background *image* would never be seen; the ink colour
        // behind it only matters for the sliver a mask antialiases against.
        foregroundImage: "./app/assets/adaptive-icon.png",
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
      withSuppressCompileSdkWarning,
      // Keeps predictive back and the portrait lock behaving as they do today,
      // both of which Android changes by default at targetSdk 36.
      withAndroid16Compat,
      withMediaPipeDuplicateFix,
      // Expo derives the Android 7-and-older launcher images from the adaptive
      // foreground, which is inset for the adaptive viewport. Regenerate that
      // pair from the full-bleed icon so they do not come out undersized.
      withAndroidLegacyIcon,
      [
        "react-native-permissions",
        {
          iosPermissions: ["Microphone", "Camera"],
        },
      ],
      [
        // NSCameraUsageDescription is written by THREE sources: this plugin,
        // react-native-vision-camera below, and the static `ios.infoPlist`
        // above. Whichever runs last wins, and the one that was winning said
        // "Allow access to your camera to take photos" — for a face-detection
        // exercise. Apple rejects usage strings that don't describe the actual
        // use (5.1.1), so all three now carry the SAME truthful sentence
        // covering both uses. If you change one, change all three.
        "expo-image-picker",
        {
          photosPermission:
            "Speechworks uses your photo library so you can choose a profile photo.",
          cameraPermission:
            "Speechworks uses your camera for on-device awareness exercises, and to take a profile photo. No video is recorded or sent.",
        },
      ],
      // Declared explicitly rather than left to Expo's default so
      // `enforceNavigationBarContrast` can be turned OFF. While the framework
      // contrast scrim is enforced, `SystemBars.setNavigationBarStyle` is a
      // no-op — nav-bar icon colours would follow the OS night mode instead of
      // the in-app Light/Dark preference (see SchemeSystemBars).
      [
        "react-native-edge-to-edge",
        {
          android: {
            parentTheme: "Default",
            enforceNavigationBarContrast: false,
          },
        },
      ],
      "expo-font",
      "expo-apple-authentication",
      "expo-secure-store",
      "expo-notifications",
      "expo-web-browser",
      [
        // These land in the iOS system permission dialogs, so they are among
        // the most-read strings we ship and App Review sees every one of them.
        // Two things were wrong: the brand was cased "SpeechWorks" (it is one
        // word, capital S only), and the speech-recognition string claimed we
        // "analyze speech patterns". We do not. `useSpeechDetection` only
        // timestamps whether sound is arriving, so the mirror exercise knows if
        // you are mid-sentence or paused. Claiming analysis was both inaccurate
        // (an Apple 5.1.1 problem in its own right) and a promise to score
        // speech, which is the one thing this product refuses to do — so the
        // denial is stated outright, where the user is deciding whether to
        // grant it.
        "expo-speech-recognition",
        {
          "microphonePermission": "Speechworks uses your microphone for recording practice and live calls.",
          "speechRecognitionPermission": "Speechworks uses speech recognition to tell when you're speaking or paused. It doesn't score your speech."
        }
      ],
      [
        "react-native-vision-camera",
        {
          // Same sentence as expo-image-picker's cameraPermission — see the
          // note there. Three writers, one string.
          cameraPermissionText:
            "Speechworks uses your camera for on-device awareness exercises, and to take a profile photo. No video is recorded or sent.",
          enableCodeScanner: false,
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            minSdkVersion: 26,
            // Google Play blocks submissions below target 36 from 2026-08-31.
            //
            // Expo SDK 53 defaults to 35; these three overrides are what make
            // the app compliant WITHOUT an SDK upgrade (54 = RN + Reanimated
            // majors, 55 = expo-av removal across 11 audio files).
            //
            // Safe to raise ONLY because edge-to-edge was enabled and verified
            // first, at target 35, on its own — Android ignores the
            // `windowOptOutEdgeToEdgeEnforcement` attribute at 36, so bumping
            // this before that work would have flipped the whole layout model
            // in the same commit. See docs/android-16-target-sdk-plan.md.
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            buildToolsVersion: "36.0.0",
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
