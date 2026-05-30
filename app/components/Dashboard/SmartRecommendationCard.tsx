import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getPack, getPackProgress, getRecommendedPack } from "../../api/packs";
import { PackProgress, PackRecommendation } from "../../api/packs/types";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";
import BottomSheetModal from "../BottomSheetModal";
import ErrorStateCard from "./ErrorStateCard";

import { useFocusEffect, useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

interface SmartRecommendationCardProps {
  style?: any;
}

const SmartRecommendationCard = ({ style }: SmartRecommendationCardProps) => {
  const insets = useSafeAreaInsets();
  const exploreNavigation = useNavigation<any>();
  const [recommendation, setRecommendation] =
    useState<PackRecommendation | null>(null);
  const [progress, setProgress] = useState<PackProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastFetchRef = useRef<number>(0);
  const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

  const fetchRecommendations = useCallback(async () => {
    try {
      setError(false);
      const rec = await getRecommendedPack();

      // Handling missing modules in recommendation summary
      if (
        rec &&
        rec.pack &&
        (!rec.pack.modules || rec.pack.modules.length === 0)
      ) {
        try {
          const fullPack = await getPack(rec.pack.id);
          if (fullPack && fullPack.modules) {
            rec.pack.modules = fullPack.modules;
          }
        } catch (err) {
          console.error("Failed to fetch full pack fallback", err);
        }
      }

      setRecommendation(rec);
      if (rec && rec.pack) {
        const prog = await getPackProgress(rec.pack.id);
        setProgress(prog);
      }
    } catch (error) {
      console.error("Failed to fetch recommendation", error);
      setError(true);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      lastFetchRef.current = Date.now();
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const timeSinceLastFetch = Date.now() - lastFetchRef.current;
      if (timeSinceLastFetch < STALE_THRESHOLD_MS && !loading) return;
      fetchRecommendations();
    }, [fetchRecommendations]),
  );

  const handleFindNext = async () => {
    setIsRefreshing(true);
    await fetchRecommendations();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator color={theme.colors.actionPrimary.default} />
      </View>
    );
  }

  if (error) {
    return (
      <ErrorStateCard
        onRetry={handleFindNext}
        variant="light"
        style={{ marginVertical: 16 }}
      />
    );
  }

  if (!recommendation) {
    return null;
  }

  // Softer Gradient: Orange 300 -> Red 300 (Peach/Salmon look)
  const gradientColors = [
    theme.colors.library.red[300],
    theme.colors.library.orange[400],
  ];

  // Redesign: All Caught Up Gradient (Emerald -> Teal)
  const allCaughtUpGradient = [
    theme.colors.library.green[300],
    "#2DD4BF", // Teal 400 equivalent for a premium look
  ];

  // Empty State: No pack recommended (e.g. "Check back later")
  if (!recommendation.pack) {
    return (
      <TouchableOpacity
        style={styles.container}
        activeOpacity={0.9}
        onPress={() =>
          exploreNavigation.navigate("ExploreStack", {
            screen: "LibraryStack",
            params: { screen: "Library", params: { from: "HOME" } },
          })
        }
      >
        <LinearGradient
          colors={allCaughtUpGradient as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, { height: 220, justifyContent: "center" }]}
        >
          {/* Decorative Bubble Circles */}
          <View style={styles.bubbleTopRight} />
          <View style={styles.bubbleBottomLeft} />

          {/* Large Watermark Icon */}
          <View
            style={[styles.mainWatermarkContainer, { top: -10, right: -10 }]}
          >
            <MaterialCommunityIcons
              name="check-decagram"
              size={140}
              color="white"
              style={{ opacity: 0.15 }}
            />
          </View>

          <View style={{ alignItems: "center", zIndex: 1 }}>
            <View
              style={[
                styles.chip,
                { backgroundColor: "rgba(255, 255, 255, 0.25)", marginBottom: 16 },
              ]}
            >
              <MaterialCommunityIcons name="star" size={14} color="white" />
              <Text style={styles.chipText}>Curated Recommendation</Text>
            </View>

            <Text
              style={[
                styles.packTitle,
                { textAlign: "center", marginBottom: 8 },
              ]}
            >
              All Caught Up!
            </Text>
            <Text
              style={[
                styles.packSubtitle,
                { textAlign: "center", paddingHorizontal: 32, opacity: 0.9 },
              ]}
            >
              {recommendation.reason ||
                "Great work on your recommended pack! We're currently curating your next set of recovery goals based on your progress. Explore the library while you wait."}
            </Text>

            <View
              style={[
                styles.creamCardFooter,
                {
                  marginTop: 24,
                  backgroundColor: "white",
                  borderRadius: 20,
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  flexDirection: "row",
                  gap: 8,
                  elevation: 4,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="video"
                size={20}
                color="#065F46" // Forest Green
              />
              <Text
                style={[
                  styles.creamCardButtonText,
                  { fontSize: 14, color: "#065F46" },
                ]}
              >
                Browse Library
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const { pack, tags } = recommendation;

  // Calculate Progress
  // Safely access modules (backend might return undefined modules list)
  const modules = pack.modules || [];

  const completedModules =
    progress?.modules.filter((m) => m.status === "COMPLETED") || [];
  const totalModules = modules.length; // Use pack modules count as source of truth for total
  let percentComplete =
    totalModules > 0 ? completedModules.length / totalModules : 0;

  if (progress?.packStatus === "COMPLETED") {
    percentComplete = 1;
  }

  if (recommendation.isRefresher) {
    percentComplete = 0;
  }

  // Get Next/Current Module
  // Sort modules by orderIndex just in case
  const sortedModules = [...modules].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  // Find the first module that is NOT completed
  let currentModule = sortedModules.find((m) => {
    const prog = progress?.modules.find((pm) => pm.moduleId === m.id);
    return !prog || prog.status !== "COMPLETED";
  });

  if (recommendation.isRefresher) {
    currentModule = sortedModules[0];
  }

  const nextModuleDisplay =
    currentModule || sortedModules[sortedModules.length - 1];
  const nextModuleOrder = nextModuleDisplay
    ? nextModuleDisplay.orderIndex
    : totalModules;

  const isSafetyMode = pack.category === "STABILIZATION";

  const nextModuleProgress =
    nextModuleDisplay && progress
      ? progress.modules.find((m) => m.moduleId === nextModuleDisplay.id)
      : null;
  const isModuleStarted =
    nextModuleProgress?.status === "IN_PROGRESS" ||
    (nextModuleProgress?.progress || 0) > 0;

  const actionButtonText = isModuleStarted ? "Resume" : "Start";
  const actionGerund = isModuleStarted ? "Resuming" : "Starting";

  const handlePress = () => {
    setModalVisible(true);
  };

  const handleStartModule = () => {
    setModalVisible(false);
    if (nextModuleDisplay) {
      // @ts-ignore - ExploreStack param list not fully propagated to this component's props yet
      exploreNavigation.navigate("ExploreStack", {
        screen: "PackModule",
        params: {
          module: nextModuleDisplay,
          packId: pack.id,
        },
      });
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        activeOpacity={0.95}
        onPress={percentComplete >= 1 ? handleFindNext : handlePress}
        disabled={percentComplete >= 1 && isRefreshing}
      >
        <LinearGradient
          colors={gradientColors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Decorative Bubble Circles */}
          <View style={styles.bubbleTopRight} />
          <View style={styles.bubbleBottomLeft} />

          <View>
            {/* 1. Header Section */}
            <View style={styles.headerRow}>
              <View style={styles.headerTextContainer}>
                <View style={styles.headerTopRow}>
                  {tags && tags.length > 0 && (
                    <View style={styles.chip}>
                      <MaterialCommunityIcons
                        name="fire"
                        size={12}
                        color="white"
                      />
                      <Text style={styles.chipText}>{tags[0].toUpperCase()}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.packTitle}>{pack.title}</Text>
                <Text style={styles.packSubtitle}>{pack.description}</Text>
              </View>
            </View>

            {/* Large Watermark Icon */}
            <View style={styles.mainWatermarkContainer}>
              <MaterialCommunityIcons
                name={isSafetyMode ? "spa" : "lightning-bolt"}
                size={240}
                color="white"
                style={{ opacity: 0.12 }}
              />
            </View>

            {/* 2. Progress Section */}
            <View style={styles.progressSection}>
              <View style={styles.progressLabels}>
                <Text style={styles.progressText}>
                  Module {nextModuleOrder} of {totalModules}
                </Text>
                <Text style={styles.progressText}>
                  {Math.round(percentComplete * 100)}%
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${percentComplete * 100}%` },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* 3. Next Module Card (Glassmorphism) or Pack Completion Card */}
          {percentComplete >= 1 ? (
            <View style={styles.creamCard}>
              <View style={styles.creamCardContent}>
                <View style={styles.innerCardWatermark}>
                  <MaterialCommunityIcons
                    name="trophy"
                    size={140}
                    color="#EA580C"
                  />
                </View>
                <View style={[styles.moduleLabelContainer, { marginTop: 8 }]}>
                  <Text style={styles.moduleLabelText}>ALL CAUGHT UP</Text>
                </View>
                <Text style={styles.creamCardTitle}>Great job!</Text>
                <Text style={styles.creamCardDesc}>
                  You have completed all your tasks for this pack. Keep going!
                </Text>
              </View>

              <View style={styles.creamCardFooter}>
                {isRefreshing && (
                  <ActivityIndicator
                    size="small"
                    color="#EA580C"
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <View style={[styles.startActionRow, { opacity: isRefreshing ? 0 : 1 }]}>
                  <MaterialCommunityIcons
                    name="play"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.creamCardButtonText}>Find Next</Text>
                </View>
              </View>
            </View>
          ) : (
            nextModuleDisplay && (
              <View style={styles.creamCard}>
                <View style={styles.creamCardContent}>
                  <View style={styles.innerCardWatermark}>
                    <MaterialCommunityIcons
                      name="microphone"
                      size={140}
                      color="#EA580C"
                    />
                  </View>
                  <View style={[styles.moduleLabelContainer, { marginTop: 8 }]}>
                    <Text style={styles.moduleLabelText}>CURRENT MODULE</Text>
                  </View>
                  <Text style={styles.creamCardTitle}>
                    {nextModuleDisplay.title.replace(/^Module \d+:\s*/, "")}
                  </Text>
                  <Text style={styles.creamCardDesc} numberOfLines={2}>
                    {nextModuleDisplay.description}
                  </Text>
                </View>
                <View style={styles.creamCardFooter}>
                  <View style={styles.startActionRow}>
                    <MaterialCommunityIcons
                      name="play-circle"
                      size={22}
                      color="#FFFFFF"
                    />
                    <Text style={styles.creamCardButtonText}>
                      {actionButtonText.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            )
          )}
        </LinearGradient>
        {recommendation.isRefresher && (
          <View style={styles.refresherBadge}>
            <Text style={styles.refresherBadgeText}>Refresher</Text>
          </View>
        )}
      </TouchableOpacity>

      <BottomSheetModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        showCloseButton={true}
        fitContent={true}
      >
        <LinearGradient
          colors={["#FFFCF9", "#FFF7ED"]}
          style={[
            styles.modalGradientContainer,
            { paddingBottom: Math.max(insets.bottom, 48) },
          ]}
        >
          {/* Watermark Background */}
          <View style={styles.modalWatermark} pointerEvents="none">
            <MaterialCommunityIcons
              name={isSafetyMode ? "spa" : "lightning-bolt"}
              size={180}
              color={theme.colors.library.orange[200]}
              style={{ opacity: 0.25, transform: [{ rotate: "-15deg" }] }}
            />
          </View>

          <Text style={styles.premiumModalTitle}>
            Ready to {actionButtonText}?
          </Text>
          <Text style={styles.premiumModalSubtitle}>
            {nextModuleDisplay
              ? `${actionGerund}: ${nextModuleDisplay.title}`
              : "Continue your journey"}
          </Text>

          <View style={styles.premiumModalActions}>
            <TouchableOpacity
              style={styles.premiumButtonShadow}
              activeOpacity={0.8}
              onPress={handleStartModule}
            >
              <LinearGradient
                colors={[
                  theme.colors.actionPrimary.default,
                  theme.colors.actionPrimary.default,
                ]}
                style={styles.premiumButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons
                  name="play"
                  color="#FFF"
                  size={24}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.premiumButtonTextPrimary}>
                  {actionButtonText}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.premiumButtonSecondary}
              activeOpacity={0.7}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.premiumButtonTextSecondary}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </BottomSheetModal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 0,
    borderRadius: 24,
    // Premium SaaS Shadow
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  loadingContainer: {
    height: 200,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 24,
  },
  packTitleEmpty: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    marginTop: 16,
    textAlign: "center",
    fontWeight: "900",
  },
  packSubtitleEmpty: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  gradient: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24, // Reduced bottom padding
    position: "relative",
    overflow: "hidden",
  },
  refresherBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#10B981", 
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  refresherBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bubbleTopRight: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  bubbleBottomLeft: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  headerRow: {
    flexDirection: "row",
    marginBottom: 24,
    zIndex: 1,
    position: "relative",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
    gap: 6,
  },
  chipText: {
    color: "white",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  packTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "white",
    marginBottom: 8,
    letterSpacing: -1,
    lineHeight: 34,
  },
  packSubtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 22,
    fontWeight: "500",
  },
  mainWatermarkContainer: {
    position: "absolute",
    top: -20,
    right: -60,
    zIndex: 0,
    transform: [{ rotate: "-15deg" }, { scaleX: -1 }],
  },
  progressSection: {
    marginBottom: 28,
    zIndex: 1,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progressText: {
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: 13,
    fontWeight: "700",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "white",
    borderRadius: 4,
  },
  // Cream Vertical Card Styles
  creamCard: {
    backgroundColor: "rgba(255, 255, 255, 0.98)", // Crisp white glass
    borderRadius: 24,
    overflow: "hidden",
    marginTop: 12,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 1)",
    // Premium Float Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 10,
  },
  creamCardContent: {
    padding: 24,
    alignItems: "center",
    paddingBottom: 24,
    position: "relative",
  },
  innerCardWatermark: {
    position: "absolute",
    top: -20,
    right: -20,
    opacity: 0.08,
    zIndex: 0,
    transform: [{ rotate: "-15deg" }],
  },
  moduleLabelContainer: {
    backgroundColor: "#FFEDD5", // Light Orange
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  moduleLabelText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#C2410C", // Orange 700
    letterSpacing: 1.5,
  },
  creamCardTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A", // Slate 900
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  creamCardDesc: {
    fontSize: 15,
    color: "#64748B", // Slate 500
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  creamCardFooter: {
    backgroundColor: "#F8FAFC", // Very subtle slate 50 for the footer
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  startActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EA580C", // Vibrant Orange Pill
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  creamCardButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1.2,
  },
  // Modal Styles
  modalGradientContainer: {
    padding: 32,
    alignItems: "center",
    paddingBottom: 48,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    position: "relative",
    overflow: "hidden",
  },
  modalWatermark: {
    position: "absolute",
    right: -40,
    top: -20,
    zIndex: 0,
  },
  premiumModalTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#111827",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.5,
    zIndex: 1,
    marginTop: 16,
  },
  premiumModalSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: "#374151",
    fontSize: 17,
    lineHeight: 26,
    textAlign: "center",
    marginBottom: 32,
    zIndex: 1,
    opacity: 0.9,
  },
  premiumModalActions: {
    width: "100%",
    gap: 16,
    zIndex: 1,
  },
  premiumButtonShadow: {
    width: "100%",
    borderRadius: 30,
    shadowColor: theme.colors.actionPrimary.default,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  premiumButtonGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
    borderRadius: 30,
  },
  premiumButtonTextPrimary: {
    ...parseTextStyle(theme.typography.Button),
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  premiumButtonSecondary: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumButtonTextSecondary: {
    ...parseTextStyle(theme.typography.Button),
    color: "#374151",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  headerTextContainer: {
    width: "100%",
    paddingRight: 72,
  },
});

export default React.memo(SmartRecommendationCard);
