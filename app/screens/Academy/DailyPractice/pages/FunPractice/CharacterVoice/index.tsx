import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { getFunPracticeByType } from "../../../../../../api/dailyPractice";
import {
  FunPractice,
  FunPracticeType,
} from "../../../../../../api/dailyPractice/types";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomScrollView from "../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../components/ScreenView";
import {
  CharacterVoiceFDPStackNavigationProp,
  CharacterVoiceFDPStackParamList,
} from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/FunPracticeStack/CharacterVoicePracticeStack/types";
import { theme } from "../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";

const CharacterVoice = () => {
  const [cvList, setcvList] = useState<FunPractice[]>([]);

  const navigation =
    useNavigation<
      CharacterVoiceFDPStackNavigationProp<
        keyof CharacterVoiceFDPStackParamList
      >
    >();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;

  // Award-Winning Gradient Palette
  // Award-Winning Gradient Palette - Lightened & Softer
  // Matte Modern Palette - "Boiled down" soft pastels, less shiny
  const CARD_THEMES = [
    { bg: ["#FCE7F3", "#FBCFE8"], text: "#831843", icon: "#BE185D" }, // Pink: Soft -> Deep Contrast
    { bg: ["#EDE9FE", "#DDD6FE"], text: "#5B21B6", icon: "#6D28D9" }, // Violet
    { bg: ["#D1FAE5", "#A7F3D0"], text: "#065F46", icon: "#059669" }, // Emerald
    { bg: ["#DBEAFE", "#BFDBFE"], text: "#1E40AF", icon: "#2563EB" }, // Blue
    { bg: ["#FEF3C7", "#FDE68A"], text: "#92400E", icon: "#D97706" }, // Amber
    { bg: ["#CCFBF1", "#99F6E4"], text: "#115E59", icon: "#0D9488" }, // Teal
  ];

  // Pseudo-random bubble variations to make the grid look organic
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
    const fetchVoices = async () => {
      const cvl = await getFunPracticeByType(FunPracticeType.CHARACTER_VOICE);
      setcvList(cvl);
    };
    fetchVoices();
  }, []);

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
      {/* Background Gradient - Matching FunPractice Teal/Cyan Theme */}
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
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Character Voice</Text>
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
                colors={["#2DD4BF", "#0F766E"]} // Teal Gradient
                style={StyleSheet.absoluteFill}
              />
              <Icon name="microphone-alt" size={32} color="#FFF" />
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Choose Your Voice</Text>
              <Text style={styles.heroSubtitle}>
                Transform your speech into something fun!
              </Text>
            </View>
          </View>

          {/* Voice Grid */}
          <View style={styles.cvGrid}>
            {cvList.map((cv, i) => {
              const theme = CARD_THEMES[i % CARD_THEMES.length];
              const bubbleConfig =
                BUBBLE_POSITIONS[i % BUBBLE_POSITIONS.length];

              return (
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate("CVExercise", {
                      id: cv.id,
                      name: cv.name,
                      cvData: cv.characterVoiceData!,
                    });
                  }}
                  key={i}
                  activeOpacity={0.9}
                  style={styles.gridItemWrapper}
                >
                  <LinearGradient
                    colors={theme.bg as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cvCardGradient}
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

                    {/* Watermark Icon - Huge & Subtle in background */}
                    <View style={styles.watermarkIconContainer}>
                      <Icon
                        name={cv.characterVoiceData?.icon || "user"}
                        size={90}
                        color={theme.icon}
                      />
                    </View>

                    <View style={styles.cardTextContent}>
                      <Text
                        style={[styles.cvName, { color: theme.text }]}
                        numberOfLines={2}
                      >
                        {cv.name}
                      </Text>
                      <Text
                        style={[
                          styles.cvDescription,
                          { color: theme.text, opacity: 0.8 },
                        ]}
                        numberOfLines={2}
                      >
                        Tap to try
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

export default CharacterVoice;

const { width } = Dimensions.get("window");
// No specific card width needed for robust flex layout, but useful if needed.
// We will use 48% width to ensure 2 columns with space between.

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120, // Increased for bottom nav clearance
    gap: 32,
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
    backgroundColor: "#2DD4BF",
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
  cvGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between", // Pushes items to edges
    // Remove gap property to rely on margin/space-between for robustness
  },
  gridItemWrapper: {
    width: "48%", // Forces 2 columns with ~4% space in between
    marginBottom: 16, // Vertical spacing
    ...parseShadowStyle(theme.shadow.elevation1),
    borderRadius: 24,
  },
  cvCardGradient: {
    height: 170, // Slightly taller
    borderRadius: 24,
    padding: 20,
    justifyContent: "center",
    gap: 12,
    position: "relative",
    overflow: "hidden",
  },
  bubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
    zIndex: 0,
  },
  watermarkIconContainer: {
    position: "absolute",
    right: -10,
    bottom: -10,
    opacity: 0.15, // Subtle watermark effect
    zIndex: 0,
    transform: [{ rotate: "-15deg" }], // Jaunty angle
  },
  cardTextContent: {
    alignItems: "flex-start", // Left align
    gap: 4,
    zIndex: 1,
    maxWidth: "85%",
  },
  cvName: {
    ...parseTextStyle(theme.typography.Heading3),
    fontWeight: "800",
    fontSize: 20,
    textAlign: "left",
  },
  cvDescription: {
    ...parseTextStyle(theme.typography.BodyDetails),
    textAlign: "left",
    fontSize: 13,
  },
});
