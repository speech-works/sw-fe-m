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
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
      icon: "email-outline",
      iconColor: "#2563EB",
      bgColor: "#EFF6FF",
      title: "Send an Email",
      sub: "Get a response within 24 hours",
      onPress: handleEmailPress,
    },
    {
      icon: "whatsapp",
      iconColor: "#16A34A",
      bgColor: "#F0FDF4",
      title: "Chat on WhatsApp",
      sub: "Instant support for quick queries",
      onPress: handleWhatsAppPress,
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

        <View style={styles.listContainer}>
          {options.map((opt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.listItem}
              onPress={opt.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.listIconContainer, { backgroundColor: opt.bgColor }]}>
                <MaterialCommunityIcons
                  name={opt.icon as any}
                  size={22}
                  color={opt.iconColor}
                />
              </View>
              <View style={styles.listTextContainer}>
                <Text style={styles.listItemText}>{opt.title}</Text>
                <Text style={styles.listItemDesc}>{opt.sub}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
              {index < options.length - 1 && <View style={styles.divider} />}
            </TouchableOpacity>
          ))}
        </View>

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
  listContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 8,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    position: "relative",
  },
  listIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  listTextContainer: {
    flex: 1,
  },
  listItemText: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text.title,
    marginBottom: 2,
  },
  listItemDesc: {
    fontSize: 13,
    color: "#64748B",
  },
  divider: {
    position: "absolute",
    bottom: 0,
    left: 76,
    right: 16,
    height: 1,
    backgroundColor: "#F1F5F9",
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
