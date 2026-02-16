import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getRecommendedPack, getPackProgress, getPack } from "../../api/packs";
import { PackRecommendation, PackProgress } from "../../api/packs/types";
import BottomSheetModal from "../BottomSheetModal";

import { useNavigation, useFocusEffect } from "@react-navigation/native";

const SmartRecommendationCard = () => {
  const navigationAcademy = useNavigation<any>();
  const [recommendation, setRecommendation] =
    useState<PackRecommendation | null>(null);
  const [progress, setProgress] = useState<PackProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);

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
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRecommendations();
    }, [fetchRecommendations]),
  );

  const handleFindNext = async () => {
    setIsRefreshing(true);
    await fetchRecommendations();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={theme.colors.actionPrimary.default} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#FEF2F2", "#FFE4E6"]} // Soft Red/Rose gradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            { justifyContent: "center", alignItems: "center", minHeight: 240 },
          ]}
        >
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: "rgba(244, 63, 94, 0.1)", // Rose-500 optimized
                marginBottom: 16,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={32}
              color={theme.colors.library.red[400]}
            />
          </View>

          <Text
            style={[
              styles.packTitle,
              {
                color: theme.colors.text.title,
                textAlign: "center",
                marginBottom: 8,
              },
            ]}
          >
            Unable to load
          </Text>
          <Text
            style={[
              styles.packSubtitle,
              {
                color: theme.colors.text.disabled,
                textAlign: "center",
                marginBottom: 24,
                maxWidth: "70%",
              },
            ]}
          >
            We couldn't load your recommendation at this time.
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: theme.colors.library.red[400],
              paddingHorizontal: 28,
              paddingVertical: 14,
              borderRadius: 30,
              shadowColor: theme.colors.library.red[400],
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
            onPress={handleFindNext}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="refresh" size={20} color="white" />
            <Text
              style={{
                color: "white",
                fontWeight: "700",
                fontSize: 15,
                letterSpacing: 0.5,
              }}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  if (!recommendation) {
    return null;
  }

  // Empty State: No pack recommended (e.g. "Check back later")
  if (!recommendation.pack) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <MaterialCommunityIcons
          name="check-circle-outline"
          size={48}
          color={theme.colors.library.green[400]}
        />
        <Text style={styles.packTitleEmpty}>All Caught Up!</Text>
        <Text style={styles.packSubtitleEmpty}>
          {recommendation.reason || "No new packs available at the moment."}
        </Text>
      </View>
    );
  }

  const { pack, tags } = recommendation;

  // Calculate Progress
  // Safely access modules (backend might return undefined modules list)
  const modules = pack.modules || [];

  const completedModules =
    progress?.modules.filter((m) => m.status === "COMPLETED") || [];
  const totalModules = modules.length; // Use pack modules count as source of truth for total
  const percentComplete =
    totalModules > 0 ? completedModules.length / totalModules : 0;

  // Get Next/Current Module
  // Sort modules by orderIndex just in case
  const sortedModules = [...modules].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  // Find the first module that is NOT completed
  const currentModule = sortedModules.find((m) => {
    const prog = progress?.modules.find((pm) => pm.moduleId === m.id);
    return !prog || prog.status !== "COMPLETED";
  });

  const nextModuleDisplay =
    currentModule || sortedModules[sortedModules.length - 1];
  const nextModuleOrder = nextModuleDisplay
    ? nextModuleDisplay.orderIndex
    : totalModules;

  const isSafetyMode = pack.category === "STABILIZATION";

  // Softer Gradient: Orange 300 -> Red 300 (Peach/Salmon look)
  const gradientColors = [
    theme.colors.library.red[300],
    theme.colors.library.orange[400],
  ];

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
      // @ts-ignore - AcademyStack param list not fully propagated to this component's props yet
      navigationAcademy.navigate("AcademyStack", {
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
      <View style={styles.container}>
        <LinearGradient
          colors={gradientColors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Decorative Bubble Circles */}
          <View style={styles.bubbleTopRight} />
          <View style={styles.bubbleBottomLeft} />

          {/* 1. Header Section */}
          <TouchableOpacity
            style={styles.headerRow}
            onPress={handlePress}
            activeOpacity={0.8}
          >
            <View style={styles.headerTextContainer}>
              {tags && tags.length > 0 && (
                <View style={styles.chip}>
                  <MaterialCommunityIcons name="fire" size={14} color="white" />
                  <Text style={styles.chipText}>{tags[0]}</Text>
                </View>
              )}

              <Text style={styles.packTitle}>{pack.title}</Text>
              <Text style={styles.packSubtitle}>{pack.description}</Text>
            </View>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons
                name={isSafetyMode ? "spa" : "lightning-bolt"}
                size={32}
                color="white"
              />
            </View>
          </TouchableOpacity>

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

          {/* 3. Next Module Card (Glassmorphism) or Pack Completion Card */}
          {percentComplete >= 1 ? (
            <View style={styles.creamCard}>
              <View style={styles.creamCardContent}>
                <View style={styles.trophyContainer}>
                  <MaterialCommunityIcons
                    name="trophy"
                    size={48}
                    color="#F97316" // Orange
                  />
                </View>
                <Text style={styles.creamCardTitle}>Great job!</Text>
                <Text style={styles.creamCardDesc}>
                  You have completed all your tasks for this pack. Keep going!
                </Text>
              </View>

              <TouchableOpacity
                style={styles.creamCardFooter}
                activeOpacity={0.8}
                onPress={handleFindNext}
                disabled={isRefreshing}
              >
                {isRefreshing && (
                  <ActivityIndicator
                    size="small"
                    color="#EA580C"
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    opacity: isRefreshing ? 0 : 1,
                  }}
                >
                  <MaterialCommunityIcons
                    name="play"
                    size={20}
                    color="#EA580C"
                  />
                  <Text style={styles.creamCardButtonText}>Find Next</Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            nextModuleDisplay && (
              <View style={styles.creamCard}>
                <View style={styles.creamCardContent}>
                  <View style={styles.trophyContainer}>
                    <MaterialCommunityIcons
                      name="microphone"
                      size={48}
                      color="#F97316" // Orange
                    />
                  </View>
                  <Text style={styles.creamCardTitle}>
                    {nextModuleDisplay.title}
                  </Text>
                  <Text style={styles.creamCardDesc} numberOfLines={3}>
                    {nextModuleDisplay.description}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.creamCardFooter}
                  activeOpacity={0.8}
                  onPress={handlePress}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="play"
                      size={20}
                      color="#EA580C"
                    />
                    <Text style={styles.creamCardButtonText}>
                      {actionButtonText}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )
          )}
        </LinearGradient>
      </View>

      <BottomSheetModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
      >
        <LinearGradient
          colors={["#FFFCF9", "#FFF7ED"]}
          style={styles.modalGradientContainer}
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
    marginVertical: 16,
    borderRadius: 24,
    // Fancy shadow
    shadowColor: theme.colors.actionPrimary.default,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
  },
  loadingContainer: {
    height: 200,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  packTitleEmpty: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    marginTop: 16,
    textAlign: "center",
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
    padding: 24,
    position: "relative",
  },
  bubbleTopRight: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  bubbleBottomLeft: {
    position: "absolute",
    bottom: -50,
    left: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  headerRow: {
    flexDirection: "row",
    marginBottom: 20,
    zIndex: 1,
    position: "relative",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 12,
    gap: 6,
  },
  chipText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  packTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "white",
    marginBottom: 4,
  },
  packSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255, 255, 255, 0.9)",
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: 0,
    right: 0,
  },
  progressSection: {
    marginBottom: 24,
    zIndex: 1,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    fontWeight: "600",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "white",
    borderRadius: 3,
  },
  // Cream Vertical Card Styles
  creamCard: {
    backgroundColor: "#FFF7ED", // Cream
    borderRadius: 24,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 8,
  },
  creamCardContent: {
    padding: 24,
    alignItems: "center",
    paddingBottom: 32,
  },
  trophyContainer: {
    marginBottom: 16,
  },
  creamCardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#431407", // Dark Brown
    marginBottom: 8,
    textAlign: "center",
  },
  creamCardDesc: {
    fontSize: 15,
    color: "#6B7280", // Slate
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  creamCardFooter: {
    backgroundColor: "#FFEDD5", // Peach
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  creamCardButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#EA580C", // Orange 600
    letterSpacing: 0.5,
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

export default SmartRecommendationCard;
