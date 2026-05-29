import { useFonts } from "expo-font";
import { Text, View } from "react-native";

import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
} from "@expo-google-fonts/inter";

const FontLoader = () => {
  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
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
