import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getAllProgramGoals } from "../../../api/programGoals";
import { GoalBlock } from "../../../api/programGoals/types";
import {
  Card,
  Page,
  Spinner,
  Text,
  space,
  spacing,
} from "../../../design-system";
import { ExploreStackNavigationProp } from "../../../navigators/stacks/ExploreStack/types";
import { GoalLine } from "./GoalLine";
import { LockedState } from "./LockedState";

/**
 * ===========================================================================
 * REACH: what they said they would do, and what happened
 * ---------------------------------------------------------------------------
 * One block per program run. Their words, their order, their dates.
 *
 * ── NOTHING IS SCORED, ANYWHERE ────────────────────────────────────────────
 * No percentage, no rate, no total across programs. The user chose these goals
 * themselves, so any score would rank somebody who named three hard things
 * below somebody who named three easy ones, and the person best served by this
 * screen is exactly the one who named the hard things.
 *
 * ── AND NOTHING IS ORDERED ACROSS PROGRAMS ─────────────────────────────────
 * Inside one program the order is theirs: they were asked which they would do
 * first and they answered. Across programs they were never asked, so the blocks
 * run newest first by date and nothing pretends otherwise.
 *
 * ── A RUN IS A BLOCK ───────────────────────────────────────────────────────
 * Two runs of the same program are two blocks. They were two different sets of
 * goals, usually aimed at different people or different calls, and merging them
 * would read as one long list of things half-done.
 * ===========================================================================
 */
const ReachScreen = () => {
  const navigation = useNavigation<ExploreStackNavigationProp<"Reach">>();
  const [blocks, setBlocks] = useState<GoalBlock[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getAllProgramGoals()
        .then((data) => alive && setBlocks(data))
        // An empty record and a failed request look the same on this screen,
        // which is wrong, but the alternative is an error page over somebody's
        // own words. Refocusing retries.
        .catch(() => alive && setBlocks([]));
      return () => {
        alive = false;
      };
    }, []),
  );

  if (blocks === null) {
    return (
      <Page title="Reach" onBack={() => navigation.goBack()}>
        <View style={styles.centre}>
          <Spinner />
        </View>
      </Page>
    );
  }

  if (blocks.length === 0) {
    return (
      <Page
        title="Reach"
        description="Things you said you would do, and what happened."
        onBack={() => navigation.goBack()}
      >
        <LockedState onBrowse={() => navigation.navigate("Programs")} />
      </Page>
    );
  }

  return (
    <Page
      title="Reach"
      description="Your words, not ours."
      onBack={() => navigation.goBack()}
    >
      {blocks.map((block, i) => (
        <Card key={`${block.packId}-${i}`} style={styles.block}>
          <Text variant="h3" color="primary">
            {block.packTitle}
          </Text>
          {/* The question is kept next to the answers on purpose. Months later
              "the landlord" means nothing without "name 3 calls you keep
              putting off" above it, and the wording is the one they were
              actually shown, not whatever the program asks today. */}
          <Text variant="caption" color="tertiary" style={styles.question}>
            {block.question}
          </Text>

          {block.goals.map((goal) => (
            <GoalLine key={goal.id} goal={goal} />
          ))}
        </Card>
      ))}
    </Page>
  );
};

const styles = StyleSheet.create({
  centre: { paddingVertical: space.sectionGap },
  block: { gap: spacing.xs },
  question: { marginBottom: spacing.sm },
});

export default ReachScreen;
