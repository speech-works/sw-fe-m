import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import {
  getProgramGoals,
  setProgramGoals,
} from "../../../api/programGoals";
import { GoalHarness } from "../../../api/programGoals/types";
import {
  Button,
  Page,
  ProgressBar,
  Spinner,
  Text,
  haptics,
  space,
} from "../../../design-system";
import {
  ExploreStackNavigationProp,
  ExploreStackRouteProp,
} from "../../../navigators/stacks/ExploreStack/types";
import { showErrorBottomSheet } from "../../../util/functions/bottomSheet";
import { track } from "../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../util/analytics/analyticsEvents";
import { ASK_COPY } from "./copy";
import { StepConfirm } from "./StepConfirm";
import { StepName } from "./StepName";
import { StepOrder } from "./StepOrder";

/**
 * ===========================================================================
 * THE ASK: one question before day 1
 * ---------------------------------------------------------------------------
 * The user names a few things in their own words, puts them in their own
 * order, and sees what they have signed up for. Three steps, one route.
 *
 * ── WHY ONE ROUTE AND NOT THREE SCREENS ────────────────────────────────────
 * The answers only exist in memory until the last step. Splitting the steps
 * across routes would mean carrying half-typed text through navigation params
 * and handling a back-swipe out of step 2 into a step 1 that has forgotten
 * everything. One route with three views keeps the draft in one place.
 *
 * ── NOTHING IS SAVED UNTIL "START DAY 1" ───────────────────────────────────
 * One POST at the end, with the answers in the order the user chose. Saving per
 * step would leave a half-set of goals behind for anybody who backed out, and
 * a half-set is worse than none: the program would gate on it.
 *
 * ── IT IS NOT A TRAP ───────────────────────────────────────────────────────
 * Back works at every step, and leaving means the program is not started. The
 * ask returns the next time they open it, because the server still says
 * `needsAsk`. A soft gate, not a locked door: somebody who opened the app to
 * do one module and got a form must be able to leave.
 * ===========================================================================
 */
const GoalsAskScreen = () => {
  const navigation = useNavigation<ExploreStackNavigationProp<"ProgramGoalsAsk">>();
  const route = useRoute<ExploreStackRouteProp<"ProgramGoalsAsk">>();
  const { packId } = route.params;

  const [harness, setHarness] = useState<GoalHarness | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    getProgramGoals(packId)
      .then((state) => {
        if (!alive) return;
        // A program with no harness asks nothing. Nothing to show, so leave
        // rather than render an empty form.
        if (!state.harness) {
          navigation.goBack();
          return;
        }
        setHarness(state.harness);
        setAnswers(Array(state.harness.count).fill(""));
      })
      .catch(() => {
        if (!alive) return;
        showErrorBottomSheet(
          "Could not load this question",
          "Please try again in a moment.",
        );
        navigation.goBack();
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [packId, navigation]);

  const back = useCallback(() => {
    if (step === 0) navigation.goBack();
    else setStep((s) => (s - 1) as 0 | 1);
  }, [step, navigation]);

  const save = useCallback(async () => {
    if (!harness) return;
    setSaving(true);
    try {
      // The user's order, not the order they were typed in.
      await setProgramGoals(
        packId,
        order.map((i) => answers[i].trim()),
      );
      haptics.medium();
      // The denominator for everything the report later says. Without it we
      // could not tell "nobody reported" from "nobody was ever asked".
      track(ANALYTICS_EVENTS.PROGRAM_GOALS_SET, {
        packId,
        answerType: harness.answerType,
        questionVersion: harness.version,
        count: order.length,
      });
      navigation.goBack();
    } catch (err: any) {
      // The server holds the real rules (how many, no blanks, not after a
      // report). Its message is the honest one, so show it rather than a
      // guess made here.
      showErrorBottomSheet(
        "Could not save your answers",
        err?.response?.data?.message ?? "Please try again in a moment.",
      );
    } finally {
      setSaving(false);
    }
  }, [harness, packId, order, answers, navigation]);

  if (loading || !harness) {
    return (
      <Page title="" onBack={() => navigation.goBack()}>
        <View style={{ paddingVertical: space.sectionGap }}>
          <Spinner />
        </View>
      </Page>
    );
  }

  const filled = answers.every((a) => a.trim().length > 0);
  const ordered = order.length === answers.length;

  const footer = (
    <Button
      label={
        step === 2 ? ASK_COPY.confirm.start : saving ? "Saving..." : "Next"
      }
      variant="primary"
      disabled={saving || (step === 0 && !filled) || (step === 1 && !ordered)}
      onPress={() => {
        if (step === 2) return void save();
        haptics.light();
        setStep((s) => (s + 1) as 1 | 2);
      }}
    />
  );

  return (
    <Page
      // Step 1 leads with the program's own question, which is the whole point
      // of the screen. Steps 2 and 3 carry their own heading inside the body,
      // so the large title would repeat it.
      title={step === 0 ? harness.question : ""}
      onBack={back}
      keyboardAvoiding
      footer={footer}
    >
      <ProgressBar value={(step + 1) / 3} />

      {step === 0 && (
        <StepName harness={harness} values={answers} onChange={setAnswers} />
      )}

      {step === 1 && (
        <StepOrder
          prompt={harness.orderPrompt}
          answers={answers.map((a) => a.trim())}
          order={order}
          onChange={setOrder}
        />
      )}

      {step === 2 && (
        <StepConfirm
          harness={harness}
          goals={order.map((i) => answers[i].trim())}
        />
      )}

      {step === 2 && (
        <Text
          variant="bodySm"
          color="tertiary"
          center
          onPress={() => setStep(0)}
        >
          {ASK_COPY.confirm.edit}
        </Text>
      )}
    </Page>
  );
};

export default GoalsAskScreen;
