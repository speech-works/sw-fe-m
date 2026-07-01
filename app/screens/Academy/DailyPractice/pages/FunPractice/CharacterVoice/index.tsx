import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import FAIcon from "react-native-vector-icons/FontAwesome5";
import { getFunPracticeByType } from "../../../../../../api/dailyPractice";
import {
  FunPractice,
  FunPracticeType,
} from "../../../../../../api/dailyPractice/types";
import PressableScale from "../../../../../../components/PressableScale";
import {
  CharacterVoiceFDPStackNavigationProp,
  CharacterVoiceFDPStackParamList,
} from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/FunPracticeStack/CharacterVoicePracticeStack/types";
import {
  Page,
  Text,
  useTheme,
  spacing,
  radius,
} from "../../../../../../design-system";

/** Vivid accent role — cycled per voice so each card in the grid stays distinct
 *  while the whole grid lives on the dark canvas (solid-accent recipe). */
type CVAccent = "info" | "success" | "warning" | "purple" | "danger";
const CV_ACCENTS: CVAccent[] = [
  "danger",
  "purple",
  "success",
  "info",
  "warning",
];

const CharacterVoice = () => {
  const [cvList, setcvList] = useState<FunPractice[]>([]);
  const [hardMode] = useState(false);
  const { colors } = useTheme();

  const navigation =
    useNavigation<
      CharacterVoiceFDPStackNavigationProp<
        keyof CharacterVoiceFDPStackParamList
      >
    >();

  useEffect(() => {
    const fetchVoices = async () => {
      const cvl = await getFunPracticeByType(
        FunPracticeType.CHARACTER_VOICE,
        hardMode,
      );
      setcvList(cvl);
    };
    fetchVoices();
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
      title="Character Voice Practice"
      description="Transform your speech into something fun!"
      onBack={() => navigation.goBack()}
    >
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View
          style={[
            styles.heroIconContainer,
            { backgroundColor: colors.accent.purple },
          ]}
        >
          <FAIcon
            name="microphone-alt"
            size={32}
            color={colors.accentOn.purple}
          />
        </View>
        <Text variant="h2" color="primary" style={styles.heroTitle}>
          Choose Your Voice
        </Text>
      </View>

      {/* Voice Grid */}
      <View style={styles.cvGrid}>
        {cvList.map((cv, i) => {
          const accent = CV_ACCENTS[i % CV_ACCENTS.length];
          const on = colors.accentOn[accent];

          return (
            <PressableScale
              key={i}
              onPress={() => {
                navigation.navigate("CVExercise", {
                  id: cv.id,
                  name: cv.name,
                  cvData: cv.characterVoiceData!,
                });
              }}
              scaleTo={0.97}
              style={styles.gridItemWrapper}
            >
              {/* Solid vivid accent fill + dark on-text — the PracticeGrid card recipe. */}
              <View
                style={[
                  styles.cvCardFill,
                  { backgroundColor: colors.accent[accent] },
                ]}
              >
                {/* Watermark Icon — huge & subtle in the background. */}
                <View style={styles.watermarkIconContainer} pointerEvents="none">
                  <FAIcon
                    name={cv.characterVoiceData?.icon || "user"}
                    size={90}
                    color={on}
                  />
                </View>

                <View style={styles.cardTextContent}>
                  <Text variant="h3" color={on} numberOfLines={2}>
                    {cv.name}
                  </Text>
                  <Text
                    variant="bodySm"
                    color={on}
                    numberOfLines={2}
                    style={styles.cvDescription}
                  >
                    Tap to try
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

export default CharacterVoice;

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
  cvGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItemWrapper: {
    width: "48%",
    marginBottom: spacing.lg,
    borderRadius: radius.card,
  },
  cvCardFill: {
    height: 170,
    borderRadius: radius.card,
    padding: spacing.xl,
    justifyContent: "center",
    gap: spacing.md,
    position: "relative",
    overflow: "hidden",
  },
  watermarkIconContainer: {
    position: "absolute",
    right: -10,
    bottom: -10,
    opacity: 0.15,
    zIndex: 0,
    transform: [{ rotate: "-15deg" }],
  },
  cardTextContent: {
    alignItems: "flex-start",
    gap: spacing.xxs,
    zIndex: 1,
    maxWidth: "85%",
  },
  cvDescription: {
    textAlign: "left",
  },
});
