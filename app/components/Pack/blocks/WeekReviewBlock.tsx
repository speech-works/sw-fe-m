import React from "react";
import { View } from "react-native";
import { WeekReviewBlockContent } from "../../../api/packs/types";
import { Text, makeStyles, space, spacing } from "../../../design-system";
import {
  groupWeekReviewEntries,
  willingnessLine,
} from "../../../util/packs/weekReview";
import { SavedReframes } from "../SavedReframes";

/**
 * What the user wrote across the week, shown on the last day so the keepsake
 * form does not ask them to remember it.
 *
 * Read only. It never writes, is never scored, and names no feeling on the
 * user's behalf: every line is a label from the form they filled and the
 * value they gave it. Counts as complete once rendered, like a TEXT block.
 */
interface WeekReviewBlockProps {
  content: WeekReviewBlockContent;
}

const DEFAULT_TITLE = "Your week";
const DEFAULT_MAX_PER_DAY = 3;
const EMPTY_COPY = "Nothing logged yet.";

export const WeekReviewBlock: React.FC<WeekReviewBlockProps> = ({ content }) => {
  const styles = useStyles();
  const title = content.title?.trim() || DEFAULT_TITLE;
  const maxPerDay =
    typeof content.maxPerDay === "number" && content.maxPerDay > 0
      ? content.maxPerDay
      : DEFAULT_MAX_PER_DAY;
  const days = (content.days ?? []).filter(
    (d) => d.entries.length > 0 || (d.reframes?.length ?? 0) > 0,
  );
  const willingness = willingnessLine(content.willingness);

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Text variant="h2" color="primary">
          {title}
        </Text>
        {content.intro ? (
          <Text variant="body" color="primary">
            {content.intro}
          </Text>
        ) : null}
      </View>

      {days.length === 0 ? (
        <Text variant="body" color="secondary">
          {EMPTY_COPY}
        </Text>
      ) : (
        <>
          {willingness ? (
            <Text variant="body" color="primary">
              {willingness}
            </Text>
          ) : null}

          <View style={styles.days}>
            {days.map((day) => (
              <View key={day.dayIndex} style={styles.day}>
                <Text variant="title" color="primary">
                  {day.title}
                </Text>
                <View style={styles.entries}>
                  {/* A day that asked one form on two steps shows each
                      step's title once, above its own lines. */}
                  {groupWeekReviewEntries(day.entries, maxPerDay).map(
                    (group, g) => (
                      <View key={`${g}:${group.title ?? ""}`} style={styles.entries}>
                        {group.title ? (
                          <Text variant="label" color="primary">
                            {group.title}
                          </Text>
                        ) : null}
                        {group.entries.map((entry) => (
                          <View
                            key={`${entry.formKey}:${entry.fieldId}`}
                            style={styles.entry}
                          >
                            <Text variant="bodySm" color="secondary">
                              {entry.label}
                            </Text>
                            <Text variant="body" color="primary">
                              {entry.value}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ),
                  )}
                  {/* Every thought and reply saved on that day's thought step. */}
                  <SavedReframes pairs={day.reframes ?? []} />
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

const useStyles = makeStyles((c) => ({
  // On the canvas like a TEXT block: this is reading material, not a step.
  block: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
    gap: space.groupGap,
  },
  header: {
    gap: space.titleSub,
  },
  days: {
    gap: space.groupGap,
  },
  day: {
    gap: space.inlineGap,
    paddingBottom: space.groupGap,
    borderBottomWidth: 1,
    borderBottomColor: c.border.hairline,
  },
  entries: {
    gap: space.rowGap,
  },
  entry: {
    gap: space.titleSub,
  },
}));
