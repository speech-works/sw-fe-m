import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { showErrorBottomSheet } from "./bottomSheet";

export const handleLinkPress = async (url: string) => {
  // Open first, ask never. `canOpenURL` answered "no" for a plain https link on
  // a Samsung with Chrome (Android package visibility, 10 Nov 2026), so "Get
  // help" on the sign-in error showed "Couldn't open that link" instead of
  // opening. `openURL` itself rejects when nothing can handle the link, on
  // both platforms, so that rejection is the one honest signal.
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error("Error opening link:", error);
    // The raw URL is not shown: it is noise to the reader and can be long
    // enough to break the sheet's layout.
    showErrorBottomSheet(
      "Couldn't open that link",
      "Your device didn't have an app that could handle it.",
    );
  }
};

/**
 * Opens a web page in a sheet inside the app. Closing the sheet leaves the
 * reader on the same screen and scroll position, so a link inside a program
 * step never loses their place. Falls back to the system browser if the sheet
 * cannot open. Only pass a URL that toSafeExternalUrl has already checked.
 */
export const openInAppBrowser = async (url: string) => {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch (error) {
    console.error("In-app browser failed, opening externally:", error);
    await handleLinkPress(url);
  }
};
