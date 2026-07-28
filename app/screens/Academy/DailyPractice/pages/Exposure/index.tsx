import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";
import {
  PracticeIcon,
  haloAccentFor,
} from "../../../../../assets/practice-icons/PracticeIcon";
import PressableScale from "../../../../../components/PressableScale";
import { useCallAllowance } from "../../../../../hooks/useCallAllowance";
import PracticeCategoryProgressCard from "../../components/PracticeCategoryProgressCard";
import {
  EDPStackNavigationProp,
  EDPStackParamList,
} from "../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/ExposureStack/types";
import { usePracticeCategorySummaryStore } from "../../../../../stores/practiceCategorySummary";
import { useUserStore } from "../../../../../stores/user";
import {
  Page,
  Text,
  Icon,
  icons,
  useTheme,
  spacing,
  radius,
  FlipDigit,
} from "../../../../../design-system";

/** Vivid accent role per sub-category — keeps each card distinct while the whole
 *  list lives on the dark canvas (the PracticeGrid solid-accent recipe). */
type ExposureAccent = "info" | "success" | "warning" | "purple" | "danger";

const Exposure = () => {
  const navigation =
    useNavigation<EDPStackNavigationProp<keyof EDPStackParamList>>();
  const { colors } = useTheme();
  const { user } = useUserStore();
  const { categories, fetchSummary } = usePracticeCategorySummaryStore();
  const allowance = useCallAllowance();

  useFocusEffect(
    React.useCallback(() => {
      if (!user?.id) {
        return;
      }

      fetchSummary(user.id).catch((error) => {
        console.error("Exposure summary error:", error);
      });
    }, [fetchSummary, user?.id]),
  );

  const exposureData: Array<{
    title: string;
    subtitle: string;
    onPress: () => void;
    iconName: string;
    accent: ExposureAccent;
    disabled: boolean;
    /**
     * Spends a CALL CREDIT rather than stamina, so the card carries the limit.
     *
     * Only the AI call does. Interview Simulation loads `type = INTERVIEW`,
     * whose rows carry no `phoneCallData` — and `phoneCallData` is exactly
     * what the credit gate keys on — so it reserves stamina like every other
     * activity. (The interview-sounding names in the PHONE_CALL table belong
     * to the Interview Ready pack, which is a different thing from this card.)
     */
    spendsCall?: boolean;
  }> = [
    {
      title: "Social Challenges",
      subtitle: "Practice uneasy conversations",
      onPress: () => navigation.navigate("SocialChallengeStack"),
      iconName: "exposure-social-challenges",
      accent: "warning", // amber
      disabled: false,
    },
    {
      title: "Interview Simulation",
      subtitle: "A mock interview, out loud",
      onPress: () => navigation.navigate("InterviewSimulationStack"),
      iconName: "exposure-interview-simulation",
      accent: "danger", // rose/red
      disabled: false,
    },
    {
      title: "AI Phone Calls",
      // Was "Speak freely, without hesitation" — a promise about FLUENCY, from
      // the one product that refuses to measure it. Someone who blocks halfway
      // through the call had been told by this card that the activity failed.
      subtitle: "One free call a week",
      onPress: () => navigation.navigate("PhoneCallStack"),
      iconName: "exposure-ai-phone-calls",
      accent: "purple", // pink → next-closest distinct role
      disabled: false,
      spendsCall: true,
    },
  ];

  const summary = categories.find(
    (category) => category.contentType === "EXPOSURE_PRACTICE",
  );

  return (
    <Page
      title="Exposure"
      description="Face your fears and build confidence with real-world scenarios."
      onBack={() => navigation.goBack()}
    >
      <View style={styles.cardsContainer}>
        {exposureData.map((item, index) => {
          const on = colors.accentOn[item.accent];
          return (
            <PressableScale
              key={index}
              onPress={item.onPress}
              disabled={item.disabled}
              scaleTo={0.97}
              style={[styles.cardWrapper, item.disabled && { opacity: 0.8 }]}
            >
              {/* Solid vivid accent fill + dark on-text — the PracticeGrid card recipe. */}
              <View
                style={[
                  styles.cardFill,
                  { backgroundColor: colors.accent[item.accent] },
                ]}
              >
                <View style={styles.cardContent}>
                  <View style={styles.copy}>
                    <Text variant="h3" color={on}>
                      {item.title}
                    </Text>
                    {item.spendsCall && allowance?.countdown ? (
                      /* The countdown gets its digit on a flip tile. One row
                         rather than one Text, because a View cannot live
                         inside a <Text> reliably on Android. The whole
                         sentence is still read as one thing by a screen
                         reader — see accessibilityLabel. */
                      <View
                        style={[styles.subtitle, styles.subtitleRow]}
                        accessible
                        accessibilityLabel={allowance.subtitle ?? undefined}
                      >
                        <Text variant="body" color={on}>
                          {allowance.countdown.before}
                        </Text>
                        <FlipDigit
                          value={allowance.countdown.days}
                          variant="body"
                          color={on}
                        />
                        <Text variant="body" color={on}>
                          {allowance.countdown.after}
                        </Text>
                      </View>
                    ) : (
                      <Text variant="body" color={on} style={styles.subtitle}>
                        {/* While the free call is spent the subtitle carries
                            the wait, because a whole sentence here cannot be
                            misread the way a three-word corner pill could. */}
                        {(item.spendsCall && allowance?.subtitle) ||
                          item.subtitle}
                      </Text>
                    )}
                  </View>
                  <View style={styles.iconContainer} pointerEvents="none">
                    <View style={styles.iconWrapper}>
                      {/* Halo contrasts the card fill so the icon stays visible. */}
                      <PracticeIcon
                        name={item.iconName}
                        size={80}
                        housing={colors.accent[haloAccentFor(item.accent)]}
                      />
                    </View>
                  </View>
                </View>

                {!item.disabled ? (
                  /* Start affordance — a small surface chip (the in-app card-chip pattern). */
                  <View
                    style={[
                      styles.startChip,
                      { backgroundColor: colors.surface.default },
                    ]}
                  >
                    <Icon
                      name={icons.play}
                      size={12}
                      color={colors.text.primary}
                    />
                    <Text variant="label" color="primary">
                      Start
                    </Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.startChip,
                      { backgroundColor: colors.surface.control },
                    ]}
                  >
                    <Icon
                      name={icons.locked}
                      size={12}
                      color={colors.text.secondary}
                    />
                    <Text variant="label" color="secondary">
                      Locked
                    </Text>
                  </View>
                )}
              </View>

              {/* Outside the fill, which clips its overflow — this pill hangs
                  off the corner, and it is the SAME green pill the cognitive
                  cards wear for FREE.

                  It only ever appears when there is a call to take. A muted
                  "spent" version of it vanished against the dark canvas it
                  overhangs, and a badge that is invisible half the time is
                  worse than one that simply is not there. */}
              {item.spendsCall && allowance?.badge ? (
                <View
                  style={[
                    styles.cornerBadge,
                    { backgroundColor: colors.accent.success },
                  ]}
                >
                  <Text variant="label" color={colors.accentOn.success}>
                    {allowance.badge}
                  </Text>
                </View>
              ) : null}
            </PressableScale>
          );
        })}
      </View>

      <PracticeCategoryProgressCard
        summary={summary ?? null}
        title="Your Courage Track"
        subtitle="Weekly exposure stays front and center. Lifetime courage stays visible too."
        badgeLabel="Exposure"
        accent="danger"
      />
    </Page>
  );
};

export default Exposure;

const styles = StyleSheet.create({
  cardsContainer: {
    gap: spacing.lg,
  },
  cardWrapper: {
    borderRadius: radius.card,
  },
  cardFill: {
    borderRadius: radius.card,
    padding: spacing.xl,
    height: 140,
    position: "relative",
    overflow: "hidden",
    justifyContent: "space-between",
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    zIndex: 1,
  },
  copy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  subtitle: {
    marginTop: spacing.xxs,
  },
  // The flip tile is a View, so the sentence around it becomes a row. Centred
  // rather than baseline-aligned: the tile is mid-rotation half the time, and
  // a baseline on a transformed box drifts.
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  iconContainer: {
    position: "absolute",
    right: -20,
    bottom: -50,
    zIndex: 0,
  },
  iconWrapper: {
    transform: [{ scale: 1.2 }, { rotate: "-10deg" }],
    opacity: 0.9,
  },
  // Copied verbatim from CognitivePractice's `cornerBadge` — same pill, same
  // overhang, same stacking. Do not re-derive these from tokens.
  cornerBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.chip,
    zIndex: 10,
  },
  startChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    alignSelf: "flex-start",
    zIndex: 2,
  },
});
