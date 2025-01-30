import { View, Text } from 'react-native';
import { useFonts } from 'expo-font';
import {
  SourceSansPro_400Regular,
  SourceSansPro_600SemiBold,
  SourceSansPro_300Light,
} from '@expo-google-fonts/source-sans-pro';

const FontLoader = () => {
    let [fontsLoaded] = useFonts({
        SourceSansPro_400Regular,
        SourceSansPro_600SemiBold,
        SourceSansPro_300Light,
      });
      if (!fontsLoaded) {
        return <View><Text>Loading fonts...</Text></View>;
      }
  return;
}

export default FontLoader