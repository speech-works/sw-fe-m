/**
 * WEB ONLY (the dev preview page; metro.config.js points react-native-safe-area-context's own './SafeAreaView' here on web).
 * The package's web SafeAreaView (5.4) pads EVERY edge when `edges` is an array, also the edges left out of it; the phone
 * pads only the listed ones. With the preview's fixed phone insets that padded screens twice. This copy pads like the phone.
 */
import * as React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context/lib/module/SafeAreaContext";

const ALL = { top: "additive", left: "additive", bottom: "additive", right: "additive" };
const value = (inset, current, mode) => (mode === "maximum" ? Math.max(current, inset) : mode === "additive" ? current + inset : current);

export const SafeAreaView = React.forwardRef(({ style = {}, mode, edges, ...rest }, ref) => {
  const insets = useSafeAreaInsets();
  const rec = edges == null ? ALL : Array.isArray(edges) ? edges.reduce((a, e) => ((a[e] = "additive"), a), {}) : edges;
  const f = StyleSheet.flatten(style) || {};
  const k = mode === "margin" ? "margin" : "padding";
  const all = f[k] ?? 0, v = f[k + "Vertical"] ?? all, h = f[k + "Horizontal"] ?? all;
  const extra = {
    [k + "Top"]: value(insets.top, f[k + "Top"] ?? v, rec.top),
    [k + "Right"]: value(insets.right, f[k + "Right"] ?? h, rec.right),
    [k + "Bottom"]: value(insets.bottom, f[k + "Bottom"] ?? v, rec.bottom),
    [k + "Left"]: value(insets.left, f[k + "Left"] ?? h, rec.left),
  };
  return <View style={[style, extra]} {...rest} ref={ref} />;
});
SafeAreaView.displayName = "SafeAreaView";
