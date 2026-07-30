import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import PressableScale from "../../../../components/PressableScale";
import {
  Text,
  Icon,
  icons,
  useTheme,
  spacing,
  radius,
  borderWidth,
} from "../../../../design-system";
import {
  fetchGrowthTotals,
  GrowthAxis,
  GrowthTotals,
  visibleTotals,
} from "../../../../api/dailyPlan";
import { countPhrase } from "../../../../util/growth/format";
import { useOnboardingNudgeStore } from "../../../../stores/onboardingNudge";
import { track } from "../../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../../util/analytics/analyticsEvents";

/**
 * ============================================================================
 * THE ONE THING ON HOME THAT IS ABOUT THEIR LIFE
 * ----------------------------------------------------------------------------
 * Home's only meters were a game level starting at zero and an energy ring that
 * reads 100% because you haven't done anything yet — and goes DOWN when you
 * practise. Neither says "we noticed". This does, in one line, and then gets
 * out of the way.
 *
 * ABOVE THE CAROUSEL AND NOT INSIDE IT (owner's decision). A carousel item has
 * to be swiped to, competes with the mood check and the onboarding card, and
 * would make a standing fact look like today's business. This is a fixed,
 * quiet row that is always in the same place.
 *
 * DELIBERATELY A SUMMARY, NOT THE CARD. One line, three numbers, no subtitles,
 * no invitation copy — the full thing lives in the progress report, which is a
 * place you choose to go. Growth is PULLED, not pushed: for people whose
 * presenting problem is avoidance, a daily unprompted comparison against
 * yourself is a demand, and the app's own rule is that a plan you cannot
 * decline is a demand.
 *
 * IT RENDERS NOTHING BEFORE THERE IS ANYTHING TRUE TO SAY. No skeleton, no
 * zeros, no "calculating". On Home the honest empty state is absence — the
 * invitation belongs on the report, where somebody has actively gone looking.
 * (TodayStrip established this rule and states it in as many words.)
 * ============================================================================
 */

const GrowthSummary: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [totals, setTotals] = useState<GrowthTotals | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void fetchGrowthTotals().then((t) => {
        if (alive && t) setTotals(t);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  /**
   * ONLY WHAT HAS ACTUALLY MOVED — never a zero.
   *
   * The card on the progress report can afford an unearned axis, because it
   * has room to say what would move it next: "Not yet — a phone call, an
   * interview or a real-life challenge would be the first." That is a door.
   * This row has no room for the sentence, so an unearned axis here would be
   * a bare "0" under a word the person may never have seen — a statement about
   * emptiness, which is precisely what the rest of this feature refuses to
   * make.
   *
   * It matters most on day one. Somebody whose first count came from the
   * welcome call would otherwise read "1 · 0 · 0" — one thing they did and two
   * things they did not, before anything had explained what any of the three
   * words mean. They now see a single earned number, and the row fills out as
   * they do.
   *
   * `hasAny` is kept as the render gate rather than `rows.length`, because it
   * is the server's own answer to the same question and the two must not be
   * able to disagree.
   */
  const rows = visibleTotals(totals).filter((r) => r.count > 0);
  const hasAny = Boolean(totals?.hasAny) && rows.length > 0;

  const growthIntroduced = useOnboardingNudgeStore(
    (s) => s.growthIntroducedAt !== null,
  );
  const markGrowthIntroduced = useOnboardingNudgeStore(
    (s) => s.markGrowthIntroduced,
  );
  const showIntro = hasAny && !growthIntroduced;

  useEffect(() => {
    if (!totals || !hasAny) return;
    // Keyed by axis, NOT by position. `rows` is filtered to what has moved, so
    // its length and order both vary — reading rows[1] as "wider" would have
    // reported Regular's count under Wider's name for anyone with a gap in the
    // middle, which is the kind of wrong that survives for months because the
    // numbers still look plausible.
    const byAxis = new Map(totals.axes.map((a) => [a.axis, a.count]));
    track(ANALYTICS_EVENTS.GROWTH_SUMMARY_SHOWN, {
      stage: "counts",
      shown: rows.length,
      braver: byAxis.get(GrowthAxis.BRAVER) ?? 0,
      wider: byAxis.get(GrowthAxis.WIDER) ?? 0,
      regular: byAxis.get(GrowthAxis.REGULAR) ?? 0,
    });
    // Only when the numbers themselves change — refocusing Home with the same
    // totals is not a new impression.
  }, [totals, hasAny, rows]);

  // See the note above: nothing to say yet means nothing on screen.
  if (!totals || !hasAny) return null;

  const open = () => {
    track(ANALYTICS_EVENTS.GROWTH_SUMMARY_TAPPED, { stage: "counts" });
    // Tapping through IS the acknowledgement — they are about to land on the
    // card, which explains all three in full. Marked here rather than on
    // render so a row sitting under an open mood sheet does not burn the one
    // introduction the vocabulary gets.
    markGrowthIntroduced();
    // Lands on the card itself rather than the top of the report. `scrollTo`
    // already exists for Achievements; "growth" reuses it so there is one
    // mechanism for "open the report at a particular thing".
    navigation.navigate("ProgressDetail", { scrollTo: "growth" });
  };

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`What you've done. ${rows
        .map((r) => `${r.label}, ${countPhrase(r.axis, r.count)}`)
        .join(". ")}. Opens your progress report.`}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface.elevated,
          borderColor: colors.border.hairline,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text variant="bodySm" color="secondary" style={styles.bold}>
          What you&apos;ve done
        </Text>
        <Icon name={icons.chevronRight} size={16} color={colors.text.tertiary} />
      </View>

      {/* ONLY IF THE COMPLETION SCREEN NEVER GOT THERE.
          In practice that means somebody whose first count came from the
          welcome call, which ends on a feelings check-in we keep free of
          scorekeeping — so this row is their first sight of the words and has
          to say what it is. Anyone who practised first has already been told,
          and repeating it here would be the app explaining itself twice. */}
      {showIntro ? (
        <Text variant="caption" color="tertiary" style={styles.intro}>
          Tap to see what this means.
        </Text>
      ) : null}

      <View style={styles.stats}>
        {rows.map((row) => (
          <View key={row.axis} style={styles.stat}>
            <Text variant="h3" color="primary">
              {row.count}
            </Text>
            {/* The label alone is safe here ONLY because it sits under a
                heading that frames the whole row as things done, and because
                tapping through reaches the subtitles immediately. Nothing in
                this component may ever present "Wider" as a standalone
                claim. */}
            <Text variant="caption" color="tertiary" numberOfLines={1}>
              {row.label}
            </Text>
          </View>
        ))}
      </View>
    </PressableScale>
  );
};

export default GrowthSummary;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  bold: { fontWeight: "600" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  intro: { marginTop: -spacing.xxs },
  stats: { flexDirection: "row", gap: spacing.xl },
  stat: { alignItems: "flex-start", minWidth: 64 },
});
