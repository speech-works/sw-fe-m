import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import React, { useEffect, useState } from "react";
import { parseTextStyle } from "../../../util/functions/parseStyles";
import { theme } from "../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
// Import from original location to reuse logic
import PracticeChart from "../../Academy/components/Progress/Chart";
import { WeeklyStat } from "../../../api/stats/types";
import { useUserStore } from "../../../stores/user";
import { getDailyActivityStatsForTheWeek } from "../../../api";

const WorldExplorationGraph = () => {
  const { user } = useUserStore();
  const [weeklyData, setWeeklyData] = useState<WeeklyStat[]>([]);

  const [percentChange, setPercentChange] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    getDailyActivityStatsForTheWeek(user.id)
      .then((data) => {
        setWeeklyData(data.days);
        setPercentChange(data.percentChange);
        setError(null);
      })
      .catch((err) => {
        console.error("Discovery stats error:", err);
        setError("Could not load exploration data");
      })
      .finally(() => setLoading(false));
  }, [user]);

  // Repurpose logic: active days = "Regions Explored" or similar concept
  const activeDays = weeklyData.filter((w) => w.totalTime > 0).length || 0;

  // Calculate a "World Explored" percentage based on activity
  // This is a visual repurposing. For now, we use activeDays as a proxy for progress.
  const worldPercentage = Math.min(100, Math.round((activeDays / 7) * 100));

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <View>
          <Text style={styles.titleText}>World Explored</Text>
        </View>
        <View style={styles.titleBadge}>
          <Icon
            name="globe-americas"
            size={12}
            color={theme.colors.library.green[500]}
          />
          <Text style={styles.badgeText}>{worldPercentage}% Discovered</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.text.title} />
      ) : error ? (
        <Text style={{ color: theme.colors.library.red[400] }}>{error}</Text>
      ) : (
        // Reusing the chart, but it displays the same data for now.
        // We customize the messages for "Discovery/World" context.
        <PracticeChart
          data={weeklyData}
          percentChange={percentChange}
          title="Discovery Map"
          emptyTitle="Start Exploring"
          emptySubtitle="There's a world to discover"
        />
      )}
    </View>
  );
};

export default WorldExplorationGraph;

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  titleContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  subTitleText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  titleBadge: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: theme.colors.library.green[100],
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  badgeText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.library.green[500],
  },
});
