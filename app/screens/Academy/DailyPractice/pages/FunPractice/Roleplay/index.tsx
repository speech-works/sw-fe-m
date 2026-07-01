import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import FAIcon from "react-native-vector-icons/FontAwesome5";
import PressableScale from "../../../../../../components/PressableScale";
import {
  RoleplayFDPStackNavigationProp,
  RoleplayFDPStackParamList,
} from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/FunPracticeStack/RoleplayPracticeStack/types";
import {
  Page,
  Text,
  useTheme,
  spacing,
  radius,
} from "../../../../../../design-system";

import { getFunPracticeByType } from "../../../../../../api/dailyPractice";
import {
  FunPractice,
  FunPracticeType,
} from "../../../../../../api/dailyPractice/types";

/** Vivid accent role — cycled per scenario so each card stays distinct while the
 *  whole list lives on the dark canvas (the PracticeGrid solid-accent recipe). */
type RoleplayAccent = "info" | "success" | "warning" | "purple" | "danger";
const RP_ACCENTS: RoleplayAccent[] = [
  "danger",
  "warning",
  "info",
  "purple",
  "success",
];

const Roleplay = () => {
  const navigation =
    useNavigation<
      RoleplayFDPStackNavigationProp<keyof RoleplayFDPStackParamList>
    >();
  const { colors } = useTheme();

  const [roleplayList, setRoleplayList] = useState<FunPractice[]>([]);
  const [hardMode] = useState(false);

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
    <Page
      title="Roleplay Practice"
      description="Master real-world social scenarios."
      onBack={() => navigation.goBack()}
    >
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View
          style={[
            styles.heroIconContainer,
            { backgroundColor: colors.accent.warning },
          ]}
        >
          <FAIcon
            name="theater-masks"
            size={32}
            color={colors.accentOn.warning}
          />
        </View>
        <Text variant="h2" color="primary" style={styles.heroTitle}>
          Act It Out
        </Text>
      </View>

      {/* Grid Layout */}
      <View style={styles.rpGrid}>
        {roleplayList.map((rp, i) => {
          const accent = RP_ACCENTS[i % RP_ACCENTS.length];
          const on = colors.accentOn[accent];

          return (
            <PressableScale
              key={rp.id}
              scaleTo={0.97}
              style={styles.gridItemWrapper}
              onPress={() => {
                navigation.navigate("RoleplayBriefing", {
                  id: rp.id,
                  title: rp.name,
                  description: rp.description,
                  roleplay: rp.rolePlayData!,
                });
              }}
            >
              {/* Solid vivid accent fill + dark on-text — the PracticeGrid card recipe. */}
              <View
                style={[
                  styles.rpCardFill,
                  { backgroundColor: colors.accent[accent] },
                ]}
              >
                {/* Trendy "Index" watermark — huge & subtle in the background. */}
                <View style={styles.watermarkContainer} pointerEvents="none">
                  <Text style={styles.watermarkText} color={on}>
                    {(i + 1).toString().padStart(2, "0")}
                  </Text>
                </View>

                <View style={styles.textContainer}>
                  <Text variant="h3" color={on}>
                    {rp.name}
                  </Text>
                  <Text
                    variant="bodySm"
                    color={on}
                    numberOfLines={2}
                    style={styles.descText}
                  >
                    {rp.description}
                  </Text>
                </View>
              </View>
            </PressableScale>
          );
        })}
      </View>
    </Page>
  );
};

export default Roleplay;

const styles = StyleSheet.create({
  heroSection: {
    alignItems: "center",
    gap: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  heroTitle: {
    textAlign: "center",
  },

  // Grid Styles
  rpGrid: {
    gap: spacing.lg,
  },
  gridItemWrapper: {
    width: "100%", // Full width for longer titles
    borderRadius: radius.card,
  },
  rpCardFill: {
    minHeight: 140, // Flexible height
    borderRadius: radius.card,
    padding: spacing.xl,
    justifyContent: "center",
    gap: spacing.sm,
    position: "relative",
    overflow: "hidden",
  },
  watermarkContainer: {
    position: "absolute",
    right: -10,
    bottom: -20,
    opacity: 0.15,
    zIndex: 0,
  },
  watermarkText: {
    fontSize: 96,
    fontWeight: "900",
    includeFontPadding: false,
    letterSpacing: -4,
  },
  textContainer: {
    gap: spacing.sm,
    alignItems: "flex-start", // Left align text
    zIndex: 1,
    maxWidth: "85%",
  },
  descText: {
    textAlign: "left",
  },
});
