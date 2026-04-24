import { LinearGradient } from "expo-linear-gradient";
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
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import ScreenView from "../../../../components/ScreenView";

const ContactSupport = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
  const handleEmailPress = () =>
    Linking.openURL("mailto:contact@speechworks.in");
  const handleWhatsAppPress = () =>
    Linking.openURL("https://wa.me/917350075986");

  const options = [
    {
      icon: "envelope",
      iconColor: "#2563EB",
      title: "Send an Email",
      sub: "Get a response within 24 hours",
      onPress: handleEmailPress,
      gradient: ["#EFF6FF", "#DBEAFE"],
      shadowColor: "#3B82F6",
    },
    {
      icon: "whatsapp",
      iconColor: "#16A34A",
      title: "Chat on WhatsApp",
      sub: "Instant support for quick queries",
      onPress: handleWhatsAppPress,
      gradient: ["#F0FDF4", "#DCFCE7"],
      shadowColor: "#22C55E",
    },
  ];

  return (
    <ScreenView style={styles.screenView}>
      {/* Aurora Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#EFF6FF", "#FFF", "#FFF"] as const}
          locations={[0, 0.4, 1]}
          style={{ flex: 1 }}
        />
      </View>

      {/* Header */}
      <BlurView
        intensity={80}
        tint="light"
        style={[
          styles.header,
          { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Support</Text>
        <View style={{ width: 32 }} />
      </BlurView>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: HEADER_HEIGHT + insets.top + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.wrapper}>
        <Text style={styles.sectionLabel}>CHOOSE A CHANNEL</Text>

        {options.map((opt) => (
          <TouchableOpacity
            key={opt.icon}
            activeOpacity={0.9}
            onPress={opt.onPress}
            style={[styles.cardWrapper, { shadowColor: opt.shadowColor }]}
          >
            <LinearGradient
              colors={opt.gradient as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              {/* Decorative Bubbles */}
              <View style={styles.bubbleLarge} />
              <View style={styles.bubbleSmall} />

              <View style={styles.iconCircle}>
                <Icon name={opt.icon} size={20} color={opt.iconColor} />
              </View>
              <View style={styles.textCol}>
                <Text style={styles.cardTitle}>{opt.title}</Text>
                <Text style={styles.cardSub}>{opt.sub}</Text>
              </View>
              <View style={styles.arrowBox}>
                <Icon name="chevron-right" size={10} color={opt.iconColor} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}

        <View style={{ height: 48 }} />
      </View>
      </ScrollView>
    </ScreenView>
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
  cardWrapper: {
    borderRadius: 24,
    ...parseShadowStyle(theme.shadow.elevation2),
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
  },
  cardGradient: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    position: "relative",
    overflow: "hidden",
  },
  bubbleLarge: {
    position: "absolute",
    top: -30,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  bubbleSmall: {
    position: "absolute",
    bottom: -20,
    left: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    zIndex: 1,
  },
  textCol: {
    flex: 1,
    gap: 2,
    zIndex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: theme.colors.text.title,
    letterSpacing: -0.3,
  },
  cardSub: {
    fontSize: 13,
    color: theme.colors.text.default,
    fontWeight: "500",
    opacity: 0.8,
  },
  arrowBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  screenView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginTop: 2,
  },
});
