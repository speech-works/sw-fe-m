import React from "react";
import {
    Linking,
    ScrollView,
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
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.wrapper}>
        {/* Email Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleEmailPress}
          style={styles.card}
        >
          <View style={styles.contentRow}>
            <View style={[styles.iconBox, { backgroundColor: "#EFF6FF" }]}>
              <Icon
                name="envelope"
                size={18}
                color={theme.colors.actionPrimary.default}
                solid
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.titleText}>Send an Email</Text>
              <Text style={styles.subText}>Get a response within 24h</Text>
            </View>
          </View>
          <Icon name="chevron-right" size={14} color="#CBD5E1" />
        </TouchableOpacity>

        {/* WhatsApp Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleWhatsAppPress}
          style={styles.card}
        >
          <View style={styles.contentRow}>
            <View style={[styles.iconBox, { backgroundColor: "#F0FDF4" }]}>
              <Icon name="whatsapp" size={20} color="#16A34A" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.titleText}>Chat on WhatsApp</Text>
              <Text style={styles.subText}>
                Instant support for quick queries
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={14} color="#CBD5E1" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default ContactSupport;

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20, // Standard 20px padding
  },
  wrapper: {
    gap: 16,
    paddingTop: 8,
  },
  card: {
    backgroundColor: "#fff", // Consistent white card
    ...parseShadowStyle(theme.shadow.elevation1),
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    gap: 4,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    fontWeight: "700",
  },
  subText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});
