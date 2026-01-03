import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  RoleplayFDPStackNavigationProp,
  RoleplayFDPStackParamList,
} from "../../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/FunPracticeStack/RoleplayPracticeStack/types";
import Icon from "react-native-vector-icons/FontAwesome5";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../../components/ScreenView";
import { theme } from "../../../../../../../Theme/tokens";
import { LinearGradient } from "expo-linear-gradient";
import TherapistFace from "../../../../../../../assets/sw-faces/TherapistFace";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";

const Briefing = () => {
  const navigation =
    useNavigation<
      RoleplayFDPStackNavigationProp<keyof RoleplayFDPStackParamList>
    >();
  const route =
    useRoute<RouteProp<RoleplayFDPStackParamList, "RoleplayBriefing">>();
  const { title, description, roleplay, id } = route.params;
  const scenarioDescription = roleplay.scenario.scenarioDetails;
  const tips = roleplay.scenario.tips;
  const roles = roleplay.scenario.availableRoles;

  const moveToChat = (selectedRoleName: string) => {
    navigation.navigate("RoleplayChat", {
      id,
      title,
      roleplay,
      selectedRoleName,
    });
  };

  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        <View style={styles.topNavigationContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.topNavigation}
          >
            <Icon
              name="chevron-left"
              size={16}
              color={theme.colors.text.default}
            />
            <Text style={styles.topNavigationText}>Roleplay</Text>
          </TouchableOpacity>
        </View>

        <CustomScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.briefCard}>
            <View style={styles.infoContainer}>
              <View style={styles.iconContainer}>
                <Icon
                  name="theater-masks"
                  size={24}
                  color={theme.colors.library.purple[400]}
                />
              </View>
              <View style={styles.roleTextContainer}>
                <Text style={styles.roleplayTitleText}>{title}</Text>
                <Text style={styles.roleplayDescText}>{description}</Text>
              </View>
              <View style={styles.roleSelectionContainer}>
                <Text style={styles.actionText}>Choose Your Role</Text>
                <View style={styles.actionContainer}>
                  {roles.map((role) => (
                    <TouchableOpacity
                      key={role.roleName}
                      onPress={() => moveToChat(role.roleName)}
                      style={[
                        styles.actionCard,
                        {
                          borderColor: theme.colors.library.purple[200],
                          backgroundColor: theme.colors.library.purple[100],
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.actionIconContainer,
                          {
                            backgroundColor: theme.colors.library.purple[200],
                          },
                        ]}
                      >
                        <Icon
                          size={20}
                          name={role.fontAwesomeIcon}
                          color={theme.colors.library.purple[600]}
                        />
                      </View>
                      <View style={styles.roleTextContanier}>
                        <Text style={styles.roleTitleText}>
                          {role.roleName}
                        </Text>
                        <Text style={styles.roleDescText}>
                          {role.roleDescription}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
          <View style={styles.scenarioCard}>
            <View style={styles.scTextContainer}>
              <Text style={styles.scTitleText}>Scenario Details</Text>
              <Text style={styles.scDesctext}>{scenarioDescription}</Text>
            </View>
            <View style={styles.footerContainer}>
              <Icon size={14} name="clock" color={theme.colors.text.default} />
              <Text style={styles.footerText}>
                Duration: {roleplay.scenario.duration} mins
              </Text>
            </View>
          </View>
          <View style={styles.tipsContainer}>
            {/* Header Banner */}
            <View style={styles.noteHeaderBanner}>
              <LinearGradient
                colors={["#FFE4E6", "#FFEDD5"]} // Soft Pink to Orange
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.noteHeaderTextContainer}>
                <Text style={styles.noteHeaderTitle}>Tips</Text>
                <Text style={styles.noteHeaderSubtitle}>Before you start</Text>
              </View>
              <TherapistFace size={72} />
            </View>

            {/* Vertical Stack */}
            <View style={styles.noteStack}>
              {tips.map((tip, index) => (
                <View key={index} style={styles.noteCard}>
                  <View style={styles.noteIconBadge}>
                    <Icon name="lightbulb" size={14} color="#F59E0B" solid />
                  </View>
                  <View style={styles.noteContent}>
                    <Text style={styles.noteTitle}>Tip {index + 1}</Text>
                    <Text style={styles.noteBody}>{tip}</Text>
                  </View>
                </View>
              ))}
            </View>
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
  },
  container: {
    flex: 1,
    gap: 32,
  },
  scrollContent: {
    gap: 32,
    flexGrow: 1,
    padding: SHADOW_BUFFER,
    paddingBottom: 20,
  },
  topNavigationContainer: {
    position: "relative",
    top: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topNavigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topNavigationText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  //////////////////////////////////

  briefCard: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },

  infoContainer: {
    gap: 24,
    alignItems: "center",
  },

  iconContainer: {
    height: 64,
    width: 64,
    borderRadius: "50%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.library.purple[100],
  },
  roleTextContainer: {
    gap: 4,
    alignItems: "center",
  },
  roleplayTitleText: {
    textAlign: "center",
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
  },
  roleplayDescText: {
    textAlign: "center",
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  roleSelectionContainer: {
    gap: 16,
    alignItems: "center",
    alignSelf: "stretch",
  },
  actionText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  actionContainer: {
    gap: 12,
    alignSelf: "stretch",
  },
  actionCard: {
    padding: 20,
    flexDirection: "row",
    gap: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  actionIconContainer: {
    height: 48,
    width: 48,
    borderRadius: "50%",
    justifyContent: "center",
    alignItems: "center",
  },
  roleTextContanier: {
    gap: 4,
    flexShrink: 1,
  },
  roleTitleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    fontWeight: 500,
  },
  roleDescText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },

  /////////////////////////////////

  scenarioCard: {
    padding: 24,
    backgroundColor: theme.colors.surface.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: 16,
    gap: 24,
    //...parseShadowStyle(theme.shadow.elevation1),
  },
  scTextContainer: {
    gap: 4,
  },
  scTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  scDesctext: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  footerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },

  /////////////////////////////////

  tipsContainer: {
    paddingHorizontal: 0,
    gap: 0,
  },
  noteHeaderBanner: {
    marginHorizontal: 0,
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
    color: "#881337", // Deep pink/red text
  },
  noteHeaderSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#9F1239",
    fontWeight: "500",
  },
  noteStack: {
    paddingHorizontal: 0,
    gap: 16,
    paddingBottom: 20,
  },
  noteCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
    // Soft, premium shadow like iOS Notes
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  noteIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF3C7", // faint yellow
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  noteContent: {
    flex: 1,
    gap: 4,
  },
  noteTitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontWeight: "700",
    color: "#171717",
  },
  noteBody: {
    ...parseTextStyle(theme.typography.Body),
    color: "#525252",
    lineHeight: 22,
  },
});
