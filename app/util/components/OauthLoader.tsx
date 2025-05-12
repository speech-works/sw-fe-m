import React, { useEffect } from "react";
import * as Google from "expo-google-sign-in";
import { Platform } from "react-native";
import { triggerToast } from "../functions/toast";

const OauthLoader = () => {
  useEffect(() => {
    const initGoogleSignIn = async () => {
      try {
        const config = {
          clientId:
            Platform.OS === "ios"
              ? "<YOUR_IOS_CLIENT_ID>" // Replace with your iOS client ID
              : "<YOUR_ANDROID_CLIENT_ID>", // Replace with your Android client ID
          scopes: ["profile", "email"], // Request user profile and email
        };

        await Google.initAsync(config);
        console.log("Google Sign-in initialized for", Platform.OS);
      } catch (error) {
        let errorMessage = "Google Sign-in Initialization Error: ";
        if (error instanceof Error) {
          errorMessage += error.message;
        } else {
          errorMessage += JSON.stringify(error);
        }
        console.error(errorMessage);
        triggerToast(
          "error",
          "Google Sign-in Initialization Error",
          errorMessage
        );
      }
    };

    initGoogleSignIn();
  }, []);

  return null; // This component doesn't need to render anything
};

export default OauthLoader;
