/** Web build = the Pip FX preview page only (dev tool); #avatars opens the user-avatar lab. The phone app's entry is App.tsx. Loads Inter like the app does. */
import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_400Regular_Italic, Inter_500Medium, Inter_600SemiBold, Inter_600SemiBold_Italic, Inter_700Bold, Inter_800ExtraBold } from "@expo-google-fonts/inter";
import React from "react";
import FxWeb from "./app/screens/FxLab/FxWeb";
import { AvatarLab } from "./app/screens/FxLab/AvatarLab";

export default function App() {
  const [ok, err] = useFonts({ Inter_400Regular, Inter_400Regular_Italic, Inter_500Medium, Inter_600SemiBold, Inter_600SemiBold_Italic, Inter_700Bold, Inter_800ExtraBold })   // every face the design system uses (as util/components/FontLoader.tsx);
  const avatars = typeof location !== "undefined" && location.hash.startsWith("#avatars");
  return ok || err ? (avatars ? <AvatarLab /> : <FxWeb />) : null;
}
