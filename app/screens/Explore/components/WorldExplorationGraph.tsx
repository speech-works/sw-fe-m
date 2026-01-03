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
import { LinearGradient } from "expo-linear-gradient";

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

  // Determine colors based on loading/error state vs content
  // We'll stick to a nice Blue/Indigo gradient for "World".

  return (
    <LinearGradient
      colors={["#22d3ee", "#60a5fa", "#818cf8"]} // Cyan-400 -> Blue-400 -> Indigo-400 (Lighter, Aurora Vibe)
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientContainer}
    >
      {/* Modern UX: Background Glow Blobs for Depth ("Mesh" effect) */}
      <View style={[styles.glowBlob, styles.blobTopRight]} />
      <View style={[styles.glowBlob, styles.blobBottomLeft]} />

      <View style={styles.titleContainer}>
        <View>
          <Text style={styles.titleText}>World Explored</Text>
        </View>
        <View style={styles.titleBadge}>
          <Icon name="globe-americas" size={12} color="#FFF" />
          <Text style={styles.badgeText}>{worldPercentage}% Discovered</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color="#F8FAFC" />
      ) : error ? (
        <Text style={{ color: "#EF4444" }}>{error}</Text>
      ) : (
        <PracticeChart
          data={weeklyData}
          percentChange={percentChange}
          title="Discovery Map"
          emptyTitle="Start Exploring"
          emptySubtitle="Jump in to discover the world"
          showTitle={false}
          backgroundColor="transparent" // Allow gradient to show through
          contentColor="#FFF"
          barColor="#FFF"
        />
      )}
    </LinearGradient>
  );
};

export default WorldExplorationGraph;

const styles = StyleSheet.create({
  // New Container: "Mission Control" Card
  gradientContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#3B82F6", // Lighter Blue Shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    overflow: "hidden", // Clip the blobs
    position: "relative",
  },
  // Decorative Blobs
  glowBlob: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.08, // Much more subtle (was 0.2)
  },
  blobTopRight: {
    top: -60, // Push further out to diffuse edge
    right: -60,
    backgroundColor: "#fff",
  },
  blobBottomLeft: {
    bottom: -60,
    left: -60,
    backgroundColor: "#6366f1",
  },
  titleContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
    zIndex: 1, // Ensure text is above blobs
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFF",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.05)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subTitleText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#94A3B8", // Slate-400
  },
  titleBadge: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.25)", // Slightly more opaque for glass feel
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  badgeText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#FFF",
    fontWeight: "700",
  },
});
