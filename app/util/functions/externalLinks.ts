import { Alert, Linking } from "react-native";

export const handleLinkPress = async (url: string) => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      // Fallback for cases where the URL cannot be opened
      Alert.alert(`Cannot open link: ${url}`);
    }
  } catch (error) {
    console.error("Error opening link:", error);
    Alert.alert("Failed to open link.", "Please try again later.");
  }
};
