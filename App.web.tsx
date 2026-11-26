/** Web build = the Pip FX preview page only (dev tool). The phone app's entry is App.tsx. Loads Inter like the app does. */
import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import React from "react";
import FxWeb from "./app/screens/FxLab/FxWeb";

export default function App() {
  const [ok, err] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold });
  return ok || err ? <FxWeb /> : null;
}
