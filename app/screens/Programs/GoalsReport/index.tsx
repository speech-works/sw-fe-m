import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  getProgramGoals,
  reportProgramGoals,
} from "../../../api/programGoals";
import {
  GoalHarness,
  GoalReport,
  ProgramGoal,
} from "../../../api/programGoals/types";
import {
  Button,
  Divider,
  Icon,
  Page,
  Spinner,
  Text,
  haptics,
  icons,
  radius,
  space,
  spacing,
  useTheme,
} from "../../../design-system";
import {
  ExploreStackNavigationProp,
  ExploreStackRouteProp,
} from "../../../navigators/stacks/ExploreStack/types";
import { showErrorBottomSheet } from "../../../util/functions/bottomSheet";
import { track } from "../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../util/analytics/analyticsEvents";
import { GoalRow } from "./GoalRow";
import { prefillAnswers } from "./prefill";
import { REPORT_LABELS } from "./labels";

/**
 * ===========================================================================
 * THE REPORT: a program does not close until this is answered
 * ---------------------------------------------------------------------------
 * On day 1 the user named a few things. This is where they say what happened.
 *
 * ── ANY ANSWER CLOSES IT ───────────────────────────────────────────────────
 * "Not yet" on every goal is a complete, valid report. Nothing in the product
 * treats it as a failure, and the goals stay open and keep surfacing
 * afterwards, because not yet is a state rather than an ending. The screen says
 * so out loud, because somebody who thinks they have to report success will
 * either lie or leave, and both cost us the only honest data we have.
 *
 * ── THE GATE IS ON THE SERVER ──────────────────────────────────────────────
 * PackProgressService.finalisePack refuses to close a pack while any goal in
 * the run has no answer. This screen is how that gets answered, not what
 * enforces it. Backing out is allowed; the program simply stays open and this
 * screen is offered again next time they open it.
 * ===========================================================================
 */
const GoalsReportScreen = () => {
  const navigation =
    useNavigation<ExploreStackNavigationProp<"ProgramGoalsReport">>();
  const route = useRoute<ExploreStackRouteProp<"ProgramGoalsReport">>();
  const { packId } = route.params;
  const { colors } = useTheme();

  const [harness, setHarness] = useState<GoalHarness | null>(null);
  const [goals, setGoals] = useState<ProgramGoal[]>([]);
  const [answers, setAnswers] = useState<Record<string, GoalReport>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    let alive = true;
    getProgramGoals(packId)
      .then((state) => {
        if (!alive) return;
        if (!state.harness || state.goals.length === 0) {
          navigation.goBack();
          return;
        }
        setHarness(state.harness);
        setGoals(state.goals);
        // Somebody may have answered some of these already, through the card on
        // Home. Start from what the server holds rather than from blank.
        setAnswers(prefillAnswers(state.goals));
      })
      .catch(() => {
        if (!alive) return;
        showErrorBottomSheet(
          "Could not load your goals",
          "Please try again in a moment.",
        );
        navigation.goBack();
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [packId, navigation]);

  /**
   * PackModule reaches this screen with `replace`, so it is no longer under us.
   * When the module was itself the entry point (a deep link, a notification)
   * there can be nothing to go back TO, and "Done" would do nothing at all.
   */
  const leave = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("Explore", {});
  }, [navigation]);

  const allAnswered = useMemo(
    () => goals.length > 0 && goals.every((g) => answers[g.id]),
    [goals, answers],
  );

  const submit = useCallback(async () => {
    setSaving(true);
    try {
      const result = await reportProgramGoals(
        packId,
        goals.map((g) => ({ goalId: g.id, report: answers[g.id] })),
      );
      haptics.medium();
      track(ANALYTICS_EVENTS.PROGRAM_GOALS_REPORTED, {
        packId,
        answerType: harness?.answerType ?? "deed",
        questionVersion: harness?.version ?? 0,
        total: goals.length,
        full: goals.filter((g) => answers[g.id] === "FULL").length,
        partial: goals.filter((g) => answers[g.id] === "PARTIAL").length,
        none: goals.filter((g) => answers[g.id] === "NONE").length,
        packClosed: result.packClosed,
      });
      setGoals(result.goals);
      setClosed(true);
    } catch (err: any) {
      showErrorBottomSheet(
        "Could not save your answers",
        err?.response?.data?.message ?? "Please try again in a moment.",
      );
    } finally {
      setSaving(false);
    }
  }, [packId, goals, answers, harness]);

  if (loading || !harness) {
    return (
      <Page title="" onBack={() => navigation.goBack()}>
        <View style={styles.centre}>
          <Spinner />
        </View>
      </Page>
    );
  }

  // ── AFTER ────────────────────────────────────────────────────────────────
  // Quiet on purpose. Nothing here is called a success or a failure, because
  // the user chose these goals themselves and a score across them would rank
  // somebody who named three hard things below somebody who named three easy
  // ones. What it does is show them their own words back.
  if (closed) {
    return (
      <Page
        title="That is the program done"
        description="Your goals stay with you. Nothing here disappears."
        footer={<Button label="Done" onPress={leave} />}
      >
        <View style={styles.summary}>
          {goals.map((goal) => (
            <View key={goal.id} style={styles.summaryRow}>
              <Text variant="body" color="primary" style={styles.flex}>
                {goal.text}
              </Text>
              <Text variant="label" color="secondary">
                {goal.report
                  ? REPORT_LABELS[goal.reportStyle][goal.report]
                  : ""}
              </Text>
            </View>
          ))}
        </View>
      </Page>
    );
  }

  return (
    <Page
      title={harness.reportPrompt}
      description="There is no wrong answer. This is the last step."
      onBack={() => navigation.goBack()}
      footer={
        <Button
          label={saving ? "Saving..." : "Finish"}
          variant="primary"
          disabled={!allAnswered || saving}
          onPress={submit}
        />
      }
    >
      {goals.map((goal, i) => (
        <View key={goal.id} style={styles.goal}>
          {i > 0 && <Divider />}
          <GoalRow
            goal={goal}
            smallerExample={harness.smallerExample}
            selected={answers[goal.id] ?? null}
            onSelect={(report) =>
              setAnswers((prev) => ({ ...prev, [goal.id]: report }))
            }
          />
        </View>
      ))}

      <View
        style={[styles.note, { backgroundColor: colors.surface.control }]}
      >
        <Icon name={icons.info} size={16} color={colors.text.secondary} />
        <Text variant="bodySm" color="secondary" style={styles.flex}>
          Whatever you pick, anything still open stays on your list. You can
          come back to it.
        </Text>
      </View>
    </Page>
  );
};

const styles = StyleSheet.create({
  centre: { paddingVertical: space.sectionGap },
  flex: { flex: 1 },
  goal: { gap: space.sectionGap },
  summary: { gap: space.rowGap },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.inlineGap,
    padding: space.cardPad,
    borderRadius: radius.input,
    marginTop: spacing.sm,
  },
});

export default GoalsReportScreen;
