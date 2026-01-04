import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import React, { useEffect, useState } from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../components/ScreenView";
import { theme } from "../../../../../../Theme/tokens";
import { LinearGradient } from "expo-linear-gradient";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";
import { useNavigation } from "@react-navigation/native";
import {
  RoleplayFDPStackNavigationProp,
  RoleplayFDPStackParamList,
} from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/FunPracticeStack/RoleplayPracticeStack/types";

import { getFunPracticeByType } from "../../../../../../api/dailyPractice";
import {
  FunPractice,
  FunPracticeType,
} from "../../../../../../api/dailyPractice/types";

const Roleplay = () => {
  const [roleplayList, setRoleplayList] = useState<FunPractice[]>([]);

  // Matte Modern Palette - Orange/Warm Family
  const RP_THEMES = [
    { bg: ["#FFF7ED", "#FFEDD5"], text: "#9A3412", icon: "#EA580C" }, // Orange: Soft -> Deep Contrast
    { bg: ["#FEF2F2", "#FEE2E2"], text: "#991B1B", icon: "#EF4444" }, // Red
    { bg: ["#FFFBEB", "#FEF3C7"], text: "#92400E", icon: "#D97706" }, // Amber
    { bg: ["#FAFAFA", "#F5F5F5"], text: "#525252", icon: "#737373" }, // Neutral Warm
    { bg: ["#FFF1F2", "#FFE4E6"], text: "#9F1239", icon: "#F43F5E" }, // Rose
  ];

  // Pseudo-random bubble variations (Shared with CharacterVoice for consistency)
  const BUBBLE_POSITIONS = [
    [
      { top: -20, right: -20, width: 90, height: 90 }, // 1. Big Top-Right
      { bottom: -10, left: 10, width: 40, height: 40 }, //    Small Bottom-Left
    ],
    [
      { bottom: -30, right: -10, width: 100, height: 100 }, // 2. Big Bottom-Right
      { top: 10, left: -20, width: 50, height: 50 }, //    Small Top-Left
    ],
    [
      { top: -40, left: -20, width: 110, height: 110 }, // 3. Big Top-Left
      { bottom: 20, right: -10, width: 30, height: 30 }, //    Tiny Bottom-Right
    ],
    [
      { top: 10, right: -50, width: 120, height: 120 }, // 4. Huge Right
      { bottom: -20, left: -20, width: 60, height: 60 }, //    Med Left
    ],
    [
      { bottom: -40, left: 40, width: 80, height: 80 }, // 5. Bottom Center
      { top: -20, right: 10, width: 40, height: 40 }, //    Small Top
    ],
  ];

  useEffect(() => {
    const fetchTwisters = async () => {
      const rp = await getFunPracticeByType(FunPracticeType.ROLE_PLAY);
      setRoleplayList(rp);
    };
    fetchTwisters();
  }, []);

  const navigation =
    useNavigation<
      RoleplayFDPStackNavigationProp<keyof RoleplayFDPStackParamList>
    >();
  return (
    <ScreenView style={styles.screenView}>
      {/* Background Gradient - Soft Orange Aurora */}
      <LinearGradient
        colors={["#FFF7ED", "#FFEDD5", "#FFF"]} // Orange 50 -> Orange 100 -> White
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.container}>
        <View style={styles.topNavigationContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon
              name="chevron-left"
              size={16}
              color={theme.colors.text.title}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Roleplay *</Text>
          <View style={{ width: 32 }} />
        </View>

        <CustomScrollView contentContainerStyle={styles.scrollContent}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroIconContainer}>
              <LinearGradient
                colors={["#FDBA74", "#EA580C"]} // Orange Gradient
                style={StyleSheet.absoluteFill}
              />
              <Icon name="theater-masks" size={32} color="#FFF" />
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Act It Out</Text>
              <Text style={styles.heroSubtitle}>
                Master real-world social scenarios.
              </Text>
            </View>
          </View>

          {/* Grid Layout */}
          <View style={styles.rpGrid}>
            {roleplayList.map((rp, i) => {
              const theme = RP_THEMES[i % RP_THEMES.length];
              const bubbleConfig =
                BUBBLE_POSITIONS[i % BUBBLE_POSITIONS.length];

              return (
                <TouchableOpacity
                  key={rp.id}
                  style={styles.gridItemWrapper}
                  activeOpacity={0.9}
                  onPress={() => {
                    navigation.navigate("RoleplayBriefing", {
                      id: rp.id,
                      title: rp.name,
                      description: rp.description,
                      roleplay: rp.rolePlayData!,
                    });
                  }}
                >
                  <LinearGradient
                    colors={theme.bg as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.rpCardGradient}
                  >
                    {/* Organic Random Bubbles */}
                    <View
                      style={[
                        styles.bubble,
                        bubbleConfig[0],
                        { backgroundColor: theme.icon, opacity: 0.08 },
                      ]}
                    />
                    <View
                      style={[
                        styles.bubble,
                        bubbleConfig[1],
                        { backgroundColor: theme.icon, opacity: 0.05 },
                      ]}
                    />

                    {/* Trendy "Index" Watermark to replace repetitive icon */}
                    <View style={styles.watermarkContainer}>
                      <Text
                        style={[styles.watermarkText, { color: theme.icon }]}
                      >
                        {(i + 1).toString().padStart(2, "0")}
                      </Text>
                    </View>

                    <View style={styles.textContainer}>
                      <Text style={[styles.titleText, { color: theme.text }]}>
                        {rp.name}
                      </Text>
                      <Text
                        style={[
                          styles.descText,
                          { color: theme.text, opacity: 0.8 },
                        ]}
                        numberOfLines={2}
                      >
                        {rp.description}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default Roleplay;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    gap: 32,
    flexGrow: 1,
    padding: SHADOW_BUFFER,
    paddingBottom: 120, // Scroll clearance
  },
  topNavigationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 10,
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
    fontWeight: "600",
  },
  heroSection: {
    alignItems: "center",
    gap: 24,
    marginTop: 10,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#FB923C",
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 2,
    borderColor: "#FFF",
  },
  heroTextContainer: {
    alignItems: "center",
    gap: 8,
  },
  heroTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    fontSize: 28,
    color: theme.colors.text.title,
    textAlign: "center",
    fontWeight: "800",
  },
  heroSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
  },

  // Grid Styles
  rpGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  gridItemWrapper: {
    width: "100%", // Full width for longer titles
    marginBottom: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderRadius: 24,
  },
  rpCardGradient: {
    minHeight: 160, // Flexible height
    borderRadius: 24,
    padding: 24,
    paddingHorizontal: 28, // More padding for premium look
    justifyContent: "center", // Vertically center text
    gap: 16,
    position: "relative",
    overflow: "hidden",
  },
  bubble: {
    position: "absolute",
    borderRadius: 999,
    zIndex: 0,
  },
  watermarkContainer: {
    position: "absolute",
    right: -10,
    bottom: -20,
    zIndex: 0,
    opacity: 0.1, // Very subtle watermark opacity
  },
  watermarkText: {
    fontSize: 96,
    fontWeight: "900",
    includeFontPadding: false,
    letterSpacing: -4,
  },
  textContainer: {
    gap: 8,
    alignItems: "flex-start", // Left align text
    zIndex: 1,
    maxWidth: "85%", // Ensure text doesn't overlap too much with the number visual weight
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 20, // Slightly bigger title
    fontWeight: "800",
    textAlign: "left",
  },
  descText: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontSize: 13,
    textAlign: "left",
    lineHeight: 18,
  },
});
