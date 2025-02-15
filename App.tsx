import { ScrollView, View, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Signup from "./app/screens/Signup";
import Login from "./app/screens/Login";
import Home from "./app/screens/Home";
import PracticeBreathing from "./app/screens/Home/components/PracticeBreathing";
import Scripts from "./app/screens/Home/components/SmoothSpeech/Scripts/Scripts";
import FontLoader from "./app/util/components/FontLoader";

import { NavigationContainer } from "@react-navigation/native";
import BottomTabNavigator from "./app/components/BottomTabNavigator";
import PracticeAffirmations from "./app/screens/Home/components/PracticeAffirmations";

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={styles.safeAreaView}
        edges={["top", "left", "right"]}
      >
        <FontLoader />
        <NavigationContainer>
          <BottomTabNavigator />
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
  },
});
