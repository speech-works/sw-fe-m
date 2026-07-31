import { Linking } from "react-native";
import { showErrorBottomSheet } from "./bottomSheet";

export const handleLinkPress = async (url: string) => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      // Fallback for cases where the URL cannot be opened. The raw URL is not
      // shown — it is noise to the reader and can be long enough to break the
      // sheet's layout.
      showErrorBottomSheet(
        "Couldn't open that link",
        "Your device didn't have an app that could handle it.",
      );
    }
  } catch (error) {
    console.error("Error opening link:", error);
    showErrorBottomSheet("Failed to open link.", "Please try again later.");
  }
};
