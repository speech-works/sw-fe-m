import { StyleSheet, Text, View } from "react-native";
import React, { useEffect, useState } from "react";
import { theme } from "../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import { getDetailedWeeklySummary } from "../../../../../api";
import { useUserStore } from "../../../../../stores/user";
import { DetailedWeeklySummaryResponse } from "../../../../../api/progressReport/types";
import Icon from "react-native-vector-icons/FontAwesome5";
import { format, addDays, startOfWeek } from "date-fns";
import * as Localization from "expo-localization";

const DetailedWeeklySummary = () => {
  const { user } = useUserStore();
  const [weeklyData, setWeeklyData] =
    useState<DetailedWeeklySummaryResponse | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchWeeklyStats = async () => {
      const stats = await getDetailedWeeklySummary(user.id);
      setWeeklyData(stats);
    };
    fetchWeeklyStats();
  }, [user]);

  const getWeekRangeLabel = () => {
    const now = new Date();
    const tz = Localization.getCalendars()[0].timeZone;
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = addDays(start, 6);
    return `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.titleText}>Weekly Summary</Text>
          <Text style={styles.dateRangeText}>{getWeekRangeLabel()}</Text>
        </View>
        <Icon
          name="calendar-alt"
          size={20}
          color={theme.colors.library.green[400]}
        />
      </View>

      {weeklyData ? (
        <View style={styles.row}>
          {/* Practice Time */}
          <View style={styles.column}>
            <Text style={styles.valueText}>
              {weeklyData.totalPracticeMinutes < 60
                ? `${weeklyData.totalPracticeMinutes}m`
                : `${(weeklyData.totalPracticeMinutes / 60).toFixed(1)}h`}
            </Text>
            <Text style={styles.labelText}>Practice Time</Text>
            <Text style={styles.deltaPositive}>
              {formatDelta(weeklyData.percentagePracticeMinutesChange, "%")}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Sessions */}
          <View style={styles.column}>
            <Text style={styles.valueText}>{weeklyData.totalSessions}</Text>
            <Text style={styles.labelText}>Days in Week</Text>
            <Text style={styles.deltaPositive}>
              {formatDelta(weeklyData.percentageSessionsChange, "%")}
            </Text>
          </View>

          {/* <View style={styles.divider} /> */}

          {/* Avg Confidence – placeholder */}
          {/* <View style={styles.column}>
            <Text style={styles.valueText}>7.2</Text>
            <Text style={styles.labelText}>Avg. Confidence</Text>
            <Text style={styles.deltaPositive}>+0.5</Text>
          </View> */}
        </View>
      ) : (
        <Text style={styles.loadingText}>Loading...</Text>
      )}
    </View>
  );
};

const formatDelta = (delta: number, unit: string) => {
  const value = delta.toFixed(1);
  const sign = delta >= 0 ? "+" : "-";
  return `${sign}${Math.abs(parseFloat(value))}${unit}`;
};

export default DetailedWeeklySummary;

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 16,
    gap: 16,
    backgroundColor: theme.colors.background.light,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginBottom: 8,
  },
  dateRangeText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 8,
  },
  column: {
    flex: 1,
    alignItems: "center",
  },
  valueText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  labelText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  deltaPositive: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.library.green[400],
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: theme.colors.border.default,
    marginHorizontal: 10,
    alignSelf: "stretch",
  },
  loadingText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    textAlign: "center",
    marginTop: 8,
  },
});
