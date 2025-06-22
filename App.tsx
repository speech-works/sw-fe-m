import React, { useEffect } from "react";
import { Audio } from "expo-av";
import { StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import FontLoader from "./app/util/components/FontLoader";
import { NavigationContainer } from "@react-navigation/native";
import MainNavigator from "./app/navigators/MainNavigator";
import { AuthContext, AuthProvider } from "./app/contexts/AuthContext";
// import Toast from "react-native-toast-message";
// import toastConfig from "./app/util/config/toastConfig";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import { SECURE_KEYS_NAME } from "./app/constants/secureStorageKeys";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ASYNC_KEYS_NAME } from "./app/constants/asyncStorageKeys";

// 👇 This is critical for trapping the OAuth redirect back into your JS:
WebBrowser.maybeCompleteAuthSession();

const App: React.FC = () => {
  useEffect(() => {
    const checkToken = async () => {
      const accessToken = await SecureStore.getItemAsync(
        SECURE_KEYS_NAME.SW_APP_JWT_KEY
      );
      const refreshToken = await SecureStore.getItemAsync(
        SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY
      );

      // await SecureStore.deleteItemAsync(SECURE_KEYS_NAME.SW_APP_JWT_KEY);
      // await SecureStore.deleteItemAsync(
      //   SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY
      // );
      // await AsyncStorage.removeItem(ASYNC_KEYS_NAME.SW_ZSTORE_USER);

      console.log(".................checkToken................");
      console.log("accessToken", accessToken);
      console.log("refreshToken", refreshToken);
      // console.log(
      //   "ASYNC_KEYS_NAME.SW_ZSTORE_USER",
      //   AsyncStorage.getItem(ASYNC_KEYS_NAME.SW_ZSTORE_USER)
      // );
    };

    checkToken();
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
          {/* <Toast config={toastConfig} /> */}
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
