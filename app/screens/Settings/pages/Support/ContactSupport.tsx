import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  useTheme,
  spacing,
  radius,
  Text,
  ListItem,
  Page,
} from "../../../../design-system";
import { SUPPORT_EMAIL, SUPPORT_URL } from "../../../Auth/constants";

const ContactSupport = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  // Both come from the shared constants now — these were duplicated literals,
  // and the auth screen had drifted onto a different (UAE) number entirely.
  const handleEmailPress = () => Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  const handleWhatsAppPress = () => Linking.openURL(SUPPORT_URL);

  return (
    <Page title="Contact support" onBack={() => navigation.goBack()}>
      <View style={styles.section}>
        <Text variant="eyebrow" color="tertiary">
          CHOOSE A CHANNEL
        </Text>

        <View style={[styles.group, { backgroundColor: colors.surface.default }]}>
          <ListItem
            leftIcon="mail"
            label="Send an Email"
            sublabel="Get a response within 24 hours"
            showChevron
            divider
            onPress={handleEmailPress}
          />
          <ListItem
            leftIcon="message-circle"
            label="Chat on WhatsApp"
            sublabel="Instant support for quick queries"
            showChevron
            onPress={handleWhatsAppPress}
          />
        </View>
      </View>
    </Page>
  );
};

export default ContactSupport;

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  group: {
    borderRadius: radius.card,
    overflow: "hidden",
  },
});
