import { ScrollView, View, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Signup from "./app/screens/Signup";
import Login from "./app/screens/Login";
import Home from "./app/screens/Home";
import FontLoader from "./app/util/components/FontLoader";

import { NavigationContainer } from "@react-navigation/native";
import BottomTabNavigator from "./app/components/BottomTabNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={styles.safeAreaView}
        edges={["top", "left", "right"]}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <FontLoader />
          <Home />
        </ScrollView>
      </SafeAreaView>

      <View style={styles.bottomNavContainer}>
        <NavigationContainer>
          <BottomTabNavigator />
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1, // allows ScrollView to take up available space
    paddingBottom: 75, // makes content visible past bottom navigator
  },
  bottomNavContainer: {
    position: "absolute", // Fixes the position at the bottom
    bottom: 0, // Ensures it sticks to the bottom of the screen
    left: 0, // Aligns it to the left of the screen
    right: 0, // Ensures it's full width
  },
});
