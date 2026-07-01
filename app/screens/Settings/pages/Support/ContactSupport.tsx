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

const ContactSupport = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const handleEmailPress = () =>
    Linking.openURL("mailto:contact@speechworks.in");
  const handleWhatsAppPress = () =>
    Linking.openURL("https://wa.me/917350075986");

  return (
    <Page title="Contact Support" onBack={() => navigation.goBack()}>
      <View style={styles.section}>
        <Text variant="label" color="tertiary">
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
