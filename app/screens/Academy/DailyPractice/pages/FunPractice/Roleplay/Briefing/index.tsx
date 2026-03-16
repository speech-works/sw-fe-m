// Redesigned Roleplay Briefing
// FORCE REFRESH BUNDLER - SYSTEM SYNC 1
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import TherapistFace from "../../../../../../../assets/sw-faces/TherapistFace";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../../components/ScreenView";
import {
  RoleplayFDPStackNavigationProp,
  RoleplayFDPStackParamList,
} from "../../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/FunPracticeStack/RoleplayPracticeStack/types";
import { theme } from "../../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";
import MasonryTips from "../../../../components/MasonryTips";

const Briefing = () => {
  console.log("RoleplayBriefing MOUNTED");
  const navigation =
    useNavigation<
      RoleplayFDPStackNavigationProp<keyof RoleplayFDPStackParamList>
    >();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
  const route =
    useRoute<RouteProp<RoleplayFDPStackParamList, "RoleplayBriefing">>();
  const { title, description, roleplay, id } = route.params;
  console.log("Briefing Params:", JSON.stringify(route.params, null, 2));
  const scenarioDescription = roleplay.scenario.scenarioDetails;
  const tips = roleplay.scenario.tips;
  const roles = roleplay.scenario.availableRoles;

  const moveToChat = (selectedRoleName: string) => {
    // Navigate to Chat
    navigation.navigate("RoleplayChat", {
      id,
      title,
      roleplay,
      selectedRoleName,
      packContext: route.params.packContext,
    });
  };

  return (
    <ScreenView style={styles.screenView}>
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
        <Text style={styles.headerTitle}>Briefing</Text>
        <View style={{ width: 32 }} />
      </BlurView>

      <View style={styles.container}>
        <CustomScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: HEADER_HEIGHT + insets.top + 20 },
          ]}
        >
          {/* Hero Briefing Card - Matte Modern Orange */}
          <LinearGradient
            colors={["#FFF7ED", "#FFEDD5"]} // Orange 50 -> 100
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.briefCard}
          >
            {/* Watermark Icon */}
            <View style={styles.watermarkIconContainer}>
              <Icon name="theater-masks" size={120} color="#EA580C" />
            </View>

            <View style={styles.infoContainer}>
              <View style={styles.roleTextContainer}>
                <Text style={styles.roleplayTitleText}>{title}</Text>
                <Text style={styles.roleplayDescText}>{description}</Text>
              </View>

              {/* Scenario Details Section */}
              <View style={styles.scenarioSection}>
                <View style={styles.sectionHeader}>
                  <Icon name="info-circle" size={14} color="#C2410C" />
                  <Text style={styles.sectionTitle}>The Scenario</Text>
                </View>
                <Text style={styles.scenarioText}>{scenarioDescription}</Text>
                <View style={styles.durationBadge}>
                  <Icon name="clock" size={12} color="#1E3A8A" />
                  <Text style={styles.durationText}>
                    {roleplay.scenario.duration} mins
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Role Selection */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Choose Your Role</Text>
            <View style={styles.roleList}>
              {roles.map((role) => (
                <TouchableOpacity
                  key={role.roleName}
                  onPress={() => moveToChat(role.roleName)}
                  style={styles.roleCard}
                  activeOpacity={0.8}
                >
                  <View style={styles.roleIconContainer}>
                    <Icon
                      size={20}
                      name={role.fontAwesomeIcon}
                      color="#EA580C"
                    />
                  </View>
                  <View style={styles.roleInfo}>
                    <Text style={styles.roleName}>{role.roleName}</Text>
                    <Text style={styles.roleDesc} numberOfLines={2}>
                      {role.roleDescription}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={14} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tips Section */}
          <View style={styles.tipsContainer}>
            {/* Header Banner - Matte Orange */}
            <View style={styles.noteHeaderBanner}>
              <LinearGradient
                colors={["#FFEDD5", "#FED7AA"]} // Orange 100 -> 200
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.noteHeaderTextContainer}>
                <Text style={styles.noteHeaderTitle}>Pro Tips</Text>
                <Text style={styles.noteHeaderSubtitle}>Before you act</Text>
              </View>
              <TherapistFace size={72} />
            </View>

            {/* Masonry Tips Grid */}
            <MasonryTips tips={tips} />
          </View>
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default Briefing;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
    backgroundColor: "#FFFFFF", // Pure White
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    gap: 32,
    flexGrow: 1,
    padding: SHADOW_BUFFER,
    paddingBottom: 200, // Increased for bottom nav clearance
    paddingHorizontal: 24,
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

  // Hero Card
  briefCard: {
    borderRadius: 24,
    padding: 24,
    position: "relative",
    overflow: "hidden",
    minHeight: 200,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  watermarkIconContainer: {
    position: "absolute",
    right: -20,
    top: -20,
    opacity: 0.1,
    transform: [{ rotate: "15deg" }],
  },
  infoContainer: {
    gap: 24,
    zIndex: 1,
  },
  roleTextContainer: {
    gap: 8,
  },
  roleplayTitleText: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#9A3412", // Deep Orange
    fontWeight: "800",
    fontSize: 28,
  },
  roleplayDescText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#9A3412",
    lineHeight: 22,
    fontWeight: "500",
    opacity: 0.9,
  },
  scenarioSection: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    textTransform: "uppercase",
    color: "#1E40AF",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  scenarioText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#1E3A8A",
    lineHeight: 20,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(30, 64, 175, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  durationText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#1E3A8A",
    fontWeight: "600",
  },

  // Role Selection
  sectionContainer: {
    gap: 16,
  },
  sectionHeading: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    fontWeight: "700",
    paddingHorizontal: 8,
  },
  roleList: {
    gap: 12,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
  },
  roleInfo: {
    flex: 1,
    gap: 4,
  },
  roleName: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 16,
    color: theme.colors.text.title,
  },
  roleDesc: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },

  // Tips
  tipsContainer: {
    gap: 0,
  },
  noteHeaderBanner: {
    marginTop: 10,
    marginBottom: 24,
    borderRadius: 24,
    height: 120, // tall banner
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    position: "relative",
  },
  noteHeaderTextContainer: {
    flex: 1,
    gap: 8,
    zIndex: 2,
  },
  noteHeaderTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 24,
    fontWeight: "800",
    color: "#9A3412", // Deep Orange
  },
  noteHeaderSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#C2410C",
    fontWeight: "600",
  },
  noteStack: {
    gap: 16,
    paddingBottom: 20,
  },
  tipsScroll: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
});
