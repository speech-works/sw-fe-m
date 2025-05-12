import { StyleSheet, View, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import { theme } from "../Theme/tokens";
import { loginUser } from "../api";
import * as AuthSession from "expo-auth-session";
import * as Linking from "expo-linking";

const OAuth = () => {
  const onPressOAuth = async (provider: string) => {
    try {
      // call your backend

      const redirectTo = AuthSession.makeRedirectUri({
        native: "speechworks://auth/callback",
        scheme: "speechworks",
      });

      const { redirectUrl } = await loginUser({
        provider,
        redirectTo,
      });

      if (redirectUrl) {
        // open the system browser to that URL
        await Linking.openURL(redirectUrl);
      }
    } catch (err) {
      console.error("OAuth failed:", err);
    }
  };

  return (
    <View style={styles.wrapper}>
      {["google", "facebook", "apple", "instagram"].map((provider) => (
        <TouchableOpacity
          key={provider}
          style={styles.iconContainer}
          activeOpacity={0.7}
          onPress={() => onPressOAuth(provider)}
        >
          <Icon name={provider} size={20} color="white" />
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default OAuth;

const styles = StyleSheet.create({
  wrapper: {
    display: "flex",
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    height: 36,
    width: 36,
    borderRadius: 6,
    backgroundColor: theme.colors.actionPrimary.default,
    alignItems: "center",
    justifyContent: "center",
  },
});
