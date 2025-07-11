import React from "react";
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";

const ContactSupport = () => {
  const handleEmailPress = () => {
    Linking.openURL("mailto:contact@speechworks.in");
  };

  const handleWhatsAppPress = () => {
    Linking.openURL("https://wa.me/917350075986");
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity onPress={handleEmailPress} style={styles.card}>
        <View style={styles.iconTextRow}>
          <Icon
            name="envelope"
            size={20}
            color={theme.colors.actionPrimary.default}
          />
          <Text style={styles.titleText}>Send us an e-mail</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleWhatsAppPress} style={styles.card}>
        <View style={styles.iconTextRow}>
          <Icon name="whatsapp" size={24} color="#25D366" />
          <Text style={styles.titleText}>Quick chat on Whatsapp</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default ContactSupport;

const styles = StyleSheet.create({
  wrapper: {
    gap: 20,
  },
  card: {
    gap: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  iconTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  textContainer: {
    gap: 4,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
});
