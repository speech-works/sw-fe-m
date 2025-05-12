import React, { useContext, useEffect } from "react";
import { Audio } from "expo-av";
import { Linking, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import FontLoader from "./app/util/components/FontLoader";
import { NavigationContainer } from "@react-navigation/native";
import MainNavigator from "./app/navigators/MainNavigator";
import { AuthContext, AuthProvider } from "./app/contexts/AuthContext";
import Toast from "react-native-toast-message";
import toastConfig from "./app/util/config/toastConfig";
import { handleOAuthCallback } from "./app/api";

const App: React.FC = () => {
  const { login } = useContext(AuthContext);
  useEffect(() => {
    const listener = Linking.addEventListener("url", async ({ url }) => {
      console.log("url in app", url);
      // url === "speechworks://auth/callback?code=xxxxxxxx"
      const [, queryString] = url.split("?");
      const params = new URLSearchParams(queryString);
      const code = params.get("code");
      console.log("code in app", code);
      if (code) {
        // exchange the code on your backend
        const { user, appJwt, refreshToken } = await handleOAuthCallback(code);
        // store your appJwt locally
        await SecureStore.setItemAsync("jwt", appJwt);
        // navigate into your authenticated app…
        login(appJwt);
      }
    });

    return () => listener.remove();
  }, []);

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
