import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getCognitivePracticeByType } from "../../../../../../api/dailyPractice";
import {
  CognitivePracticeType,
  ReframingThoughtScenarioData,
} from "../../../../../../api/dailyPractice/types";
import { completePracticeActivity } from "../../../../../../api/practiceActivities";
import type { ReframeReply } from "../../../../../../api/practiceActivities/types";
import { SimpleMarkdown } from "../../../../../../components/Pack/SimpleMarkdown";
import { SavedReframes } from "../../../../../../components/Pack/SavedReframes";
import TextArea from "../../../../../../components/TextArea";
import {
  Button,
  Page,
  Spinner,
  Surface,
  Text,
  radius,
  space,
  spacing,
  useTheme,
} from "../../../../../../design-system";
import { useConfirmOnExit } from "../../../../../../hooks/useConfirmOnExit";
import { useActivityStore } from "../../../../../../stores/activity";
import { useUserStore } from "../../../../../../stores/user";
import { showErrorBottomSheet } from "../../../../../../util/functions/bottomSheet";
import { returnToProgramDay } from "../../../../../../util/packs/returnToProgramDay";
import {
  MAX_SAVED_REPLIES,
  addReply,
  canSaveReply,
  nextThoughtIndex,
} from "../../../../../../util/packs/reframeReplies";
import type { PackContext } from "../../../../../../utils/packActivityNavigation";

/**
 * THE PROGRAM THOUGHT SCREEN (founder decisions A10 and D2, 2026-10).
 *
 * Opened only from a program day, for a Reframe step. The Explore Reframe
 * screen stays as it is; this one replaces it inside programs because that
 * screen hid the day's instructions, used labels the programs do not use,
 * saved one reply only, and counted a tapped library line as a reply.
 *
 * Top to bottom: the day's instructions and encouragement, one thought from
 * the day's series with a "Next thought" button, the series' example answers
 * as plain text under "Ways people answer it" (no evidence cards, D2), then
 * a box for the person's own words, labelled with the day's prompt. "Save"
 * keeps what is in the box with the thought it answers and empties the box,
 * so somebody can answer several thoughts. An empty box cannot be saved, and
 * the example answers cannot be picked. Done sends every saved pair with the
 * completion and goes back to the day. The step was started (no stamina) by
 * the day screen before this one opened.
 *
 * Every word on this screen is either the day's own text, the series' own
 * text, or one of the approved labels. Do not add copy here without approval.
 */
const ProgramThought = () => {
  const route = useRoute<any>();
  const { practiceActivity, packContext } = (route.params ?? {}) as {
    practiceActivity?: any;
    packContext?: PackContext;
  };
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const accentColor = colors.accent.info;
  const onAccentColor = colors.accentOn.info;
  const { updateActivity } = useActivityStore();

  const series = practiceActivity?.cognitivePractice;
  const [scenarios, setScenarios] = useState<ReframingThoughtScenarioData[]>(
    series?.reframingThoughtsData?.scenarios ?? [],
  );
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState<ReframeReply[]>([]);
  const [finishing, setFinishing] = useState(false);
  const [done, setDone] = useState(false);
  const activityId: string | undefined = practiceActivity?.id;

  // The series normally comes with the activity. If it did not, load it by id.
  useEffect(() => {
    if (scenarios.length > 0 || !series?.id) return;
    let live = true;
    getCognitivePracticeByType(CognitivePracticeType.REFRAMING_THOUGHTS)
      .then((rows) => {
        const own = rows.find((r: any) => r.id === series.id);
        if (live) setScenarios(own?.reframingThoughtsData?.scenarios ?? []);
      })
      .catch((e) => console.error("[ProgramThought] series load failed", e));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scenario = scenarios[index];
  const thought = scenario?.negativeThought?.trim();
  const examples = (scenario?.reframedThoughts ?? [])
    .map((o) => o.text?.trim())
    .filter((t): t is string => !!t);

  const finish = async (pairs: ReframeReply[]) => {
    if (finishing || pairs.length === 0) return;
    const userId = useUserStore.getState().user?.id;
    if (!activityId || !userId) return;
    setFinishing(true);
    try {
      const completed = await completePracticeActivity({
        id: activityId,
        userId,
        packId: packContext?.packId,
        moduleId: packContext?.moduleId,
        reframes: pairs,
      });
      updateActivity(activityId, { ...completed });
      useUserStore.getState().fetchUser();
      setDone(true);
      returnToProgramDay(navigation, packContext);
    } catch (e) {
      console.error("[ProgramThought] completion failed", e);
      showErrorBottomSheet(
        "Save Failed",
        "We couldn't save your progress. Please try again.",
      );
    } finally {
      setFinishing(false);
    }
  };

  // Leaving with replies saved: the exit sheet's Save keeps them, and words
  // still in the box count as one more reply. With nothing written there is
  // nothing to keep, so the person stays on the screen.
  const { exitSheet } = useConfirmOnExit({
    navigation,
    activityId,
    isCompleted: done,
    onSave: () => void finish(addReply(saved, thought, text)),
    family: "Cognitive",
    packContext,
    accentColor,
    onAccentColor,
  });

  const onSave = () => {
    const next = addReply(saved, thought, text);
    if (next !== saved) {
      setSaved(next);
      setText("");
    }
  };

  const onNextThought = () => {
    setIndex((i) => nextThoughtIndex(i, scenarios.length));
  };

  const instructions = packContext?.instructions?.trim();
  const encouragement = packContext?.encouragement?.trim();

  return (
    <>
      <Page
        title={series?.name}
        onBack={() => navigation.goBack()}
        keyboardAvoiding
        footerDocked
        footer={
          saved.length > 0 ? (
            <Button
              label="Done"
              onPress={() => void finish(saved)}
              loading={finishing}
              accentColor={accentColor}
              onAccentColor={onAccentColor}
            />
          ) : undefined
        }
        contentGap={space.sectionGap}
      >
        {instructions ? (
          <SimpleMarkdown content={instructions} textColor={colors.text.primary} />
        ) : null}
        {encouragement ? (
          <SimpleMarkdown content={encouragement} textColor={colors.text.secondary} />
        ) : null}

        {!scenario ? (
          <Spinner />
        ) : (
          <>
            <Surface level="elevated" rounded="card" style={styles.thoughtCard}>
              <Text variant="h3" color="primary">
                &quot;{thought}&quot;
              </Text>
              {scenarios.length > 1 ? (
                <Button
                  label="Next thought"
                  variant="secondary"
                  onPress={onNextThought}
                />
              ) : null}
            </Surface>

            {examples.length > 0 ? (
              <View style={styles.section}>
                <Text variant="label" color="tertiary">
                  Ways people answer it
                </Text>
                {examples.map((line, i) => (
                  <Text key={`${index}:${i}`} variant="body" color="secondary">
                    {line}
                  </Text>
                ))}
              </View>
            ) : null}

            <View style={styles.section}>
              {packContext?.writePrompt ? (
                <Text variant="title" color="primary">
                  {packContext.writePrompt}
                </Text>
              ) : null}
              <TextArea
                value={text}
                onChangeText={setText}
                placeholder={packContext?.writePlaceholder}
                accessibilityLabel={packContext?.writePrompt}
                maxLength={500}
                numberOfLines={3}
                inputStyle={[styles.input, { color: colors.text.primary }]}
                containerStyle={{
                  ...styles.box,
                  backgroundColor: colors.surface.elevated,
                  borderColor: colors.border.hairline,
                }}
              />
              <Button
                label="Save"
                variant="secondary"
                onPress={onSave}
                disabled={
                  !canSaveReply(text) || !thought || saved.length >= MAX_SAVED_REPLIES
                }
              />
            </View>

            <SavedReframes pairs={saved} />
          </>
        )}
      </Page>
      {exitSheet}
    </>
  );
};

export default ProgramThought;

const styles = StyleSheet.create({
  thoughtCard: {
    padding: spacing.lg,
    gap: space.groupGap,
  },
  section: {
    gap: space.rowGap,
  },
  box: {
    borderWidth: 1,
    borderRadius: radius.input,
    padding: space.inlineGap,
  },
  input: {
    fontSize: 16,
    minHeight: 100,
  },
});
