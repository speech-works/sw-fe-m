import { StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import FontLoader from "./app/util/components/FontLoader";

import { NavigationContainer } from "@react-navigation/native";
import MainNavigator from "./app/navigators/MainNavigator";
import { AuthProvider } from "./app/contexts/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <SafeAreaView
          style={styles.safeAreaView}
          edges={["top", "left", "right"]}
        >
          <FontLoader />
          <NavigationContainer>
            <MainNavigator />
          </NavigationContainer>
        </SafeAreaView>
      </SafeAreaProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
  },
});
