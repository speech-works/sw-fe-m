/**
 * withAndroid16Compat.js
 *
 * Preserves two behaviours that Android CHANGES OUT FROM UNDER THE APP the
 * moment `targetSdkVersion` reaches 36. Both are opt-outs, both are temporary,
 * and both exist so the targetSdk bump is a compliance change rather than a
 * product change. See docs/android-16-target-sdk-plan.md.
 *
 * 1. PREDICTIVE BACK — at target 36 the system's predictive back animations are
 *    enabled by default, `onBackPressed()` stops being called, and
 *    `KEYCODE_BACK` stops being dispatched. This app has a `BackHandler`
 *    listener (MoodCheck FollowUp) on top of React Navigation's own back
 *    handling throughout, and back currently drives things like the practice
 *    exit sheet. `enableOnBackInvokedCallback="false"` keeps today's behaviour.
 *
 *    Expo SDK 53's prebuild-config has NO `predictiveBackGestureEnabled` key,
 *    which is the only reason this is hand-written rather than app.config.js.
 *
 * 2. LARGE-SCREEN RESIZABILITY — at target 36, on displays with a smallest
 *    width >= 600dp (tablets, unfolded foldables, desktop windowing), Android
 *    IGNORES `screenOrientation`, `resizableActivity` and the aspect-ratio
 *    attributes. This app declares `android:screenOrientation="portrait"` and
 *    every screen is designed portrait-first, so without this it would land in
 *    landscape on those devices. `PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY`
 *    restores the portrait lock.
 *
 *    This is a raw manifest <property> string, not a public SDK constant — it
 *    does not appear in android.jar, so it can only be written literally.
 *
 *    ⚠️ TEMPORARY: this opt-out STOPS WORKING at targetSdk 37. Adaptive
 *    large-screen layout is a real future commitment, not something this
 *    plugin defers forever.
 */

const { withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");

const RESIZABILITY_PROPERTY =
  "android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY";

/** @type {import('@expo/config-plugins').ConfigPlugin} */
const withAndroid16Compat = (config) => {
  return withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults,
    );

    // (1) Predictive back — keep the pre-36 dispatch behaviour.
    application.$["android:enableOnBackInvokedCallback"] = "false";

    // (2) Large-screen resizability — keep the portrait lock.
    // Filter first so repeated prebuilds stay idempotent (a duplicate
    // <property> of the same name is a manifest-merger error, not a warning).
    const existing = application["property"] ?? [];
    application["property"] = [
      ...existing.filter((p) => p?.$?.["android:name"] !== RESIZABILITY_PROPERTY),
      {
        $: {
          "android:name": RESIZABILITY_PROPERTY,
          "android:value": "true",
        },
      },
    ];

    return config;
  });
};

module.exports = withAndroid16Compat;
