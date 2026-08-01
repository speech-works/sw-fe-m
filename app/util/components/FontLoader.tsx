import { useFonts } from "expo-font";
import React from "react";
import { View } from "react-native";

import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
} from "@expo-google-fonts/inter";

import { useTheme } from "../../design-system";

/**
 * Holds the app back until Inter is registered.
 *
 * THIS IS A GATE, NOT A SIDE-EFFECT. It used to render its loading state as a
 * SIBLING of the app tree, which meant the entire UI painted and laid out while
 * Inter was still loading. Android fell back to Roboto, which is narrower;
 * nothing re-rendered when Inter arrived (every <Text>'s props were unchanged —
 * only the native resolution of the family name changed), so Yoga never
 * re-measured and Inter's wider glyphs drew inside Roboto-sized boxes. Chips cut
 * mid-word and centred Button labels sliced at both ends. Whether you saw it was
 * a coin flip between the font read and the first layout, which is why a restart
 * (font files now in the OS page cache) appeared to "fix" it.
 *
 * Rendering ANY text before the fonts land is the bug, so the placeholder is a
 * bare canvas-coloured fill — it continues the splash rather than flashing a
 * differently-coloured frame at it. Must therefore sit inside ThemeProvider.
 *
 * Embedding the TTFs natively (expo-font's config plugin) was tried as a way to
 * skip the wait and rejected: Android resolves asset fonts as
 * `fonts/<family><styleSuffix>.ttf`, and anything the type scale pairs with
 * fontWeight >= 700 asks for a `_bold` suffix that a plain copy does not
 * provide, so the bold weights would have quietly fallen back to Roboto. Gating
 * is the whole fix; keep it that way unless the suffix naming is handled too.
 */
const FontLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // `error` is deliberately part of the condition. Gating on `fontsLoaded`
  // alone would turn a font that fails to load into a permanently blank app;
  // before this gate existed such a failure merely degraded to the system font.
  // Falling through on error keeps that graceful degradation.
  const [fontsLoaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const { colors } = useTheme();

  if (!fontsLoaded && !error) {
    return <View style={{ flex: 1, backgroundColor: colors.background.canvas }} />;
  }

  return <>{children}</>;
};

export default FontLoader;
