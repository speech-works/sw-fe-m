import { StyleSheet, Text, View } from "react-native";
import React, { useEffect, useState } from "react";
import { theme } from "../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import Angry1 from "../../../../../assets/mood-check/Angry1";
import Calm1 from "../../../../../assets/mood-check/Calm1";
import Happy1 from "../../../../../assets/mood-check/Happy1";
import Sad1 from "../../../../../assets/mood-check/Sad1";
import { getWeeklyMoodReport } from "../../../../../api";
import { useUserStore } from "../../../../../stores/user";
import { getMoodRemark } from "./helper";

const MoodSummary = () => {
  const { user } = useUserStore();
  const [moodStats, setMoodStats] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    const fetchMoodStats = async () => {
      const moods = await getWeeklyMoodReport(user.id);
      setMoodStats(moods);
    };
    fetchMoodStats();
  }, [user]);

  const icons = {
    ANGRY: Angry1,
    CALM: Calm1,
    HAPPY: Happy1,
    SAD: Sad1,
  };

  const nonZeroMoods = Object.entries(moodStats).filter(
    ([, percentage]) => percentage > 0
  );

  return (
    <View style={styles.card}>
      <Text style={styles.titleText}>Mood Summary (weekly)</Text>

      <View style={styles.moodWrapContainer}>
        {nonZeroMoods.map(([mood, percentage]) => {
          const Icon = icons[mood as keyof typeof icons];
          if (!Icon) return null;

          return (
            <View key={mood} style={[styles.moodItem, {}]}>
              <Icon width={48} height={48} />
              <Text style={styles.moodName}>
                {mood.charAt(0) + mood.slice(1).toLowerCase()}
              </Text>
              <Text style={styles.moodPercentage}>
                {percentage.toFixed(1)}%
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.remarkContainer}>
        <Text style={styles.remarkText}>{getMoodRemark(moodStats)}</Text>
      </View>
    </View>
  );
};

export default MoodSummary;

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 16,
    gap: 16,
    backgroundColor: theme.colors.background.light,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginBottom: 8,
  },
  moodWrapContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  moodItem: {
    alignItems: "center",
    width: 100,
    gap: 4,
    marginRight: 4,
    marginBottom: 24,
  },
  moodName: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  moodPercentage: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  remarkContainer: {
    marginTop: -24,
    borderRadius: 12,
    padding: 12,
    backgroundColor: theme.colors.background.default,
  },
  remarkText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});
