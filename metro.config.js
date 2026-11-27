const path = require("path");
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// WEB ONLY (the dev preview page, App.web.tsx; the phone builds never take this branch). zustand's ESM build uses
// `import.meta`, which the web bundle (a classic script) cannot load ("Cannot use 'import.meta' outside a module"), so
// nothing that reaches a store (the whole design system, through PressableScale) could be shown on the preview page.
// On web, zustand resolves to its CommonJS build.
const upstreamResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && (moduleName === "zustand" || moduleName.startsWith("zustand/"))) {
    const file = moduleName === "zustand" ? "index.js" : moduleName.slice("zustand/".length) + ".js";
    return { type: "sourceFile", filePath: path.join(__dirname, "node_modules", "zustand", file) };
  }
  // web: the package's SafeAreaView pads edges left out of `edges` (see app/screens/FxLab/shims/SafeAreaView.web.js)
  if (platform === "web" && moduleName === "./SafeAreaView" && /react-native-safe-area-context[\\/]lib[\\/]module[\\/]index\.js$/.test(context.originModulePath)) {
    return { type: "sourceFile", filePath: path.join(__dirname, "app", "screens", "FxLab", "shims", "SafeAreaView.web.js") };
  }
  return (upstreamResolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
