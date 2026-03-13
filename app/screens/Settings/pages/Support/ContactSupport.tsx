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
  const handleEmailPress = () =>
    Linking.openURL("mailto:contact@speechworks.in");
  const handleWhatsAppPress = () =>
    Linking.openURL("https://wa.me/917350075986");

  const options = [
    {
      icon: "envelope",
      iconColor: "#2563EB",
      iconBg: "#EFF6FF",
      title: "Send an Email",
      sub: "Get a response within 24 hours",
      onPress: handleEmailPress,
    },
    {
      icon: "whatsapp",
      iconColor: "#16A34A",
      iconBg: "#F0FDF4",
      title: "Chat on WhatsApp",
      sub: "Instant support for quick queries",
      onPress: handleWhatsAppPress,
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.wrapper}>
        <Text style={styles.sectionLabel}>CHOOSE A CHANNEL</Text>

        {options.map((opt) => (
          <TouchableOpacity
            key={opt.icon}
            activeOpacity={0.85}
            onPress={opt.onPress}
            style={styles.card}
          >
            <View style={[styles.iconCircle, { backgroundColor: opt.iconBg }]}>
              <Icon name={opt.icon} size={20} color={opt.iconColor} />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.cardTitle}>{opt.title}</Text>
              <Text style={styles.cardSub}>{opt.sub}</Text>
            </View>
            <View style={styles.arrowBox}>
              <Icon name="chevron-right" size={11} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 48 }} />
      </View>
    </ScrollView>
  );
};

export default ContactSupport;

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  wrapper: {
    gap: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.text.default,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    ...parseShadowStyle(theme.shadow.elevation1),
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text.title,
  },
  cardSub: {
    fontSize: 13,
    color: theme.colors.text.default,
  },
  arrowBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
});
