import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../components/ScreenView";
import {
  RoleplayFDPStackNavigationProp,
  RoleplayFDPStackParamList,
} from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/FunPracticeStack/RoleplayPracticeStack/types";
import { theme } from "../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";

import { getFunPracticeByType } from "../../../../../../api/dailyPractice";
import {
  FunPractice,
  FunPracticeType,
} from "../../../../../../api/dailyPractice/types";
import { useUserStore } from "../../../../../../stores/user";
import HardModeToggle from "../../../components/HardModeToggle";

const Roleplay = () => {
  const navigation =
    useNavigation<
      RoleplayFDPStackNavigationProp<keyof RoleplayFDPStackParamList>
    >();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;

  const [roleplayList, setRoleplayList] = useState<FunPractice[]>([]);
  const [hardMode, setHardMode] = useState(false);
  const { user } = useUserStore();
  const canUseHardMode = (user?.fearedSounds?.length ?? 0) > 0;

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
      const rp = await getFunPracticeByType(FunPracticeType.ROLE_PLAY, hardMode);
      setRoleplayList(rp);
    };
    fetchTwisters();
  }, [hardMode]);

  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        tabBarStyle: { display: "none" },
      });
    }
    return () => {
      parent?.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);

  return (
    <ScreenView style={styles.screenView}>
      {/* Background Gradient - Soft Orange Aurora */}
      <LinearGradient
        colors={["#FFF7ED", "#FFEDD5", "#FFF"]} // Orange 50 -> Orange 100 -> White
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />

      <BlurView
        intensity={80}
        tint="light"
        style={[
          styles.topNavigationContainer,
          { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Roleplay Practice</Text>
        <View style={{ width: 32 }} />
      </BlurView>

      <View style={styles.container}>
        <CustomScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: HEADER_HEIGHT + insets.top + 20 },
          ]}
        >

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
    paddingBottom: 180, // Scroll clearance
  },
  topNavigationContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
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
  headerRight: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerHardModeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerHardModeActive: {
    backgroundColor: "#FFF7ED",
    borderColor: "rgba(234, 88, 12, 0.3)",
  },
  activeDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EA580C",
    borderWidth: 1.5,
    borderColor: "#FFF",
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
