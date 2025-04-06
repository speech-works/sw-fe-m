import React, { useEffect } from "react";
import { Audio } from "expo-av";
import { StyleSheet, Button } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import FontLoader from "./app/util/components/FontLoader";
import { NavigationContainer } from "@react-navigation/native";
import MainNavigator from "./app/navigators/MainNavigator";
import { AuthProvider } from "./app/contexts/AuthContext";
import Toast from "react-native-toast-message";
import toastConfig from "./app/util/config/toastConfig";

const App: React.FC = () => {
  useEffect(() => {
    const checkForUpdates = async () => {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    };

    checkForUpdates();
  }, []);
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
          <Toast config={toastConfig} />
        </SafeAreaView>
      </SafeAreaProvider>
    </AuthProvider>
  );
};

export default App;

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
  },
});
