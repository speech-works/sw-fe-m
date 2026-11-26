/** Web build = the Pip FX preview page only (dev tool). The phone app's entry is App.tsx. Loads Inter like the app does. */
import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_400Regular_Italic, Inter_500Medium, Inter_600SemiBold, Inter_600SemiBold_Italic, Inter_700Bold, Inter_800ExtraBold } from "@expo-google-fonts/inter";
import React from "react";
import FxWeb from "./app/screens/FxLab/FxWeb";

export default function App() {
  const [ok, err] = useFonts({ Inter_400Regular, Inter_400Regular_Italic, Inter_500Medium, Inter_600SemiBold, Inter_600SemiBold_Italic, Inter_700Bold, Inter_800ExtraBold })   // every face the design system uses (as util/components/FontLoader.tsx);
  return ok || err ? <FxWeb /> : null;
}
