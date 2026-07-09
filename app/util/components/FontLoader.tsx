import { useFonts } from "expo-font";
import { Text, View } from "react-native";

import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
} from "@expo-google-fonts/inter";

const FontLoader = () => {
  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  if (!fontsLoaded) {
    return (
      <View>
        <Text>Loading fonts...</Text>
      </View>
    );
  }
  return;
};

export default FontLoader;
