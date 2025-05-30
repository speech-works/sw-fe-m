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
  const { title, description } = route.params;

  const moveToChat = () => {
    navigation.navigate("RoleplayChat", {
      title,
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
                <Text style={styles.roleplayDescText}>
                  A fun conversation between an alien and a restaurant staff
                </Text>
              </View>
              <View style={styles.roleSelectionContainer}>
                <Text style={styles.actionText}>Choose Your Role</Text>
                <View style={styles.actionContainer}>
                  <TouchableOpacity
                    onPress={moveToChat}
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
                        name="reddit-alien"
                        color={theme.colors.library.purple[600]}
                      />
                    </View>
                    <View style={styles.roleTextContanier}>
                      <Text style={styles.roleTitleText}>Alien Customer</Text>
                      <Text style={styles.roleDescText}>
                        Order Earth's famous pizza
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={moveToChat}
                    style={[
                      styles.actionCard,
                      {
                        borderColor: theme.colors.library.orange[200],
                        backgroundColor: theme.colors.library.orange[100],
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.actionIconContainer,
                        {
                          backgroundColor: theme.colors.library.orange[200],
                        },
                      ]}
                    >
                      <Icon
                        size={20}
                        name="utensils"
                        color={theme.colors.library.orange[600]}
                      />
                    </View>
                    <View style={styles.roleTextContanier}>
                      <Text style={styles.roleTitleText}>Restaurant Staff</Text>
                      <Text style={styles.roleDescText}>
                        Take the alien's order
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <View></View>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.scenarioCard}>
            <View style={styles.scTextContainer}>
              <Text style={styles.scTitleText}>Scenario Details</Text>
              <Text style={styles.scDesctext}>{description}</Text>
            </View>
            <View style={styles.footerContainer}>
              <Icon size={14} name="clock" color={theme.colors.text.default} />
              <Text style={styles.footerText}>Duration: ~5 minutes</Text>
            </View>
          </View>
          <View style={styles.tipsContainer}>
            <View style={styles.tipTitleContainer}>
              <Icon
                solid
                name="lightbulb"
                size={16}
                color={theme.colors.text.title}
              />
              <Text style={styles.tipTitleText}>Tips</Text>
            </View>
            <View style={styles.tipListContainer}>
              <View style={styles.tipCard}>
                <Icon
                  solid
                  name="star"
                  size={16}
                  color={theme.colors.library.orange[400]}
                />
                <Text style={styles.tipText}>
                  Stay in character throughout the conversation
                </Text>
              </View>
              <View style={styles.tipCard}>
                <Icon
                  solid
                  name="clock"
                  size={16}
                  color={theme.colors.library.green[400]}
                />
                <Text style={styles.tipText}>
                  Practice each word separately first
                </Text>
              </View>
              <View style={styles.tipCard}>
                <Icon
                  solid
                  name="list-ol"
                  size={16}
                  color={theme.colors.library.purple[400]}
                />
                <Text style={styles.tipText}>Pick from options to respond</Text>
              </View>
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
    padding: 16,
    gap: 16,
  },
  tipTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tipTitleText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.title,
  },
  tipListContainer: {
    gap: 12,
  },
  tipCard: {
    backgroundColor: theme.colors.surface.elevated,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tipText: {
    flexShrink: 1,
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});
