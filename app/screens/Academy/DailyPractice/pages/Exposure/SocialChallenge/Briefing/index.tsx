import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useMarkActivityStart } from "../../../../../../../hooks/useMarkActivityStart";
import { PracticeActivityContentType } from "../../../../../../../api/practiceActivities/types";
import {
  SCEDPStackNavigationProp,
  SCEDPStackParamList,
} from "../../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/ExposureStack/SocialChallengeStack/types";
import {
  Page,
  Button,
  Surface,
  Text,
  Icon,
  icons,
  useTheme,
  spacing,
} from "../../../../../../../design-system";


const Briefing = () => {
  const { colors } = useTheme();
  // Social Challenge = the "warning" (amber) accent from the Exposure hub card.
  const accentColor = colors.accent.warning;
  // The scenario icon is colored foreground on the card — the AA-legible cut.
  const accentFg = colors.feedback.warningText;
  const onAccentColor = colors.accentOn.warning;
  const navigation =
    useNavigation<SCEDPStackNavigationProp<keyof SCEDPStackParamList>>();
  const route = useRoute<RouteProp<SCEDPStackParamList, "SCBriefing">>();
  const { sc, packContext, practiceActivity } = route.params as any;
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    practiceActivity?.id || null,
  );

  const data = sc.practiceData || sc.socialChallengeData;

  // ...

  const markActivityStart = useMarkActivityStart({
    contentType: PracticeActivityContentType.EXPOSURE_PRACTICE,
    contentId: sc?.id,
    initialActivity: practiceActivity,
    packContext,
    currentActivityId,
    setActivityId: setCurrentActivityId,
    navigation,
    logTag: "SocialChallenge",
    // SocialChallenge briefing historically does not emit ACTIVITY_STARTED analytics.
    trackStart: false,
  });

  const tips: string[] = data?.stage?.userCharacter || [];

  return (
    <Page
      title={sc.name}
      description={sc.description}
      onBack={() => navigation.goBack()}
      footer={
        <Button
          label="Begin Challenge"
          accentColor={accentColor}
          onAccentColor={onAccentColor}
          onPress={async () => {
            const activityId = await markActivityStart();
            if (activityId) {
              navigation.navigate("SCChat", {
                sc,
                practiceActivityId: activityId,
                packContext,
              } as any);
            }
          }}
        />
      }
    >
      {/* Scenario Details — a dark card on the canvas. */}
      <Surface level="default" rounded="card" padded={spacing["2xl"]}>
        <View style={styles.scenarioHeader}>
          <Icon name={icons.challenge} size={16} color={accentFg} />
          <Text variant="label" color="tertiary" style={styles.scenarioLabel}>
            THE SCENARIO
          </Text>
        </View>
        <Text variant="body" color="secondary" style={styles.scenarioText}>
          {data?.scenario?.scenarioDetails ||
            "Navigate this social situation with confidence."}
        </Text>
      </Surface>

      {/* Tips — a dot timeline on the dark canvas. */}
      {tips.length > 0 && (
        <View>
          <Text variant="h3" color="primary" style={styles.tipsHeading}>
            Tips
          </Text>
          {tips.map((tip, index, arr) => (
            <View key={index} style={styles.tipRow}>
              <View style={styles.tipTrack}>
                <View
                  style={[styles.tipDot, { backgroundColor: accentColor }]}
                />
                {index !== arr.length - 1 && (
                  <View
                    style={[
                      styles.tipLine,
                      { backgroundColor: colors.border.default },
                    ]}
                  />
                )}
              </View>
              <Text variant="body" color="secondary" style={styles.tipText}>
                {tip}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Page>
  );
};

export default Briefing;

const styles = StyleSheet.create({
  scenarioHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  scenarioLabel: {
    letterSpacing: 1.5,
  },
  scenarioText: {
    lineHeight: 26,
  },
  tipsHeading: {
    marginBottom: spacing.lg,
  },
  tipRow: {
    flexDirection: "row",
  },
  tipTrack: {
    alignItems: "center",
    width: 20,
    marginRight: spacing.lg,
  },
  tipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 7,
  },
  tipLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: -4,
  },
  tipText: {
    flex: 1,
    paddingBottom: spacing["2xl"],
    lineHeight: 24,
  },
});
