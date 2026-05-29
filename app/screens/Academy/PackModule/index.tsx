import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  completeModule,
  getModule,
  getPack,
  getPackProgress,
  startModule,
} from "../../../api/packs";
import { ContentBlockType, Pack, PackModule, PackStatus } from "../../../api/packs/types";
import BottomSheetModal from "../../../components/BottomSheetModal";
import { ContentRenderer } from "../../../components/Pack/ContentRenderer";
import { TactileTouchableOpacity } from "../../../components/TactileTouchableOpacity";
import { ROUTE_NAMES } from "../../../constants/routes";
import { useActivityStore } from "../../../stores/activity";
import { theme } from "../../../Theme/tokens";
import {
  parseShadowStyle as parseStyleShadow,
  parseTextStyle,
} from "../../../util/functions/parseStyles";
import { ExploreStackNavigationProp } from "../../../navigators/stacks/ExploreStack/types";
import { track } from "../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../util/analytics/analyticsEvents";

type PackModuleScreenRouteProp = RouteProp<
  {
    params: {
      module?: PackModule;
      packId: string;
      moduleId?: string;
      initialBlockIndex?: number;
    };
  },
  "params"
>;

const { width } = Dimensions.get("window");

const PackModuleScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ExploreStackNavigationProp<"PackModule">>();
  const route = useRoute<PackModuleScreenRouteProp>();
  const {
    module: initialModule,
    packId,
    moduleId: initialModuleId,
    initialBlockIndex,
  } = route.params;
  const { activities, isActivityCompleted } = useActivityStore();

  // If we have initialModule, use it. If not, use undefined (will fetch).
  const [module, setModule] = useState<PackModule | undefined>(initialModule);
  const [loading, setLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);

  // Wizard State - Initialize with passed index or 0
  const [currentBlockIndex, setCurrentBlockIndex] = useState(
    initialBlockIndex || 0,
  );

  // Update currentBlockIndex if initialBlockIndex changes (e.g. from back navigation)
  useEffect(() => {
    if (initialBlockIndex !== undefined) {
      setCurrentBlockIndex(initialBlockIndex);
    }
  }, [initialBlockIndex]);

  // Interactive Block Completion Tracking (ACTIVITY + FORM)
  const [completedInteractiveBlocks, setCompletedInteractiveBlocks] = useState<
    Set<string>
  >(new Set());

  // Persistent mapping of block IDs to activity instance IDs
  const [blockToActivityMap, setBlockToActivityMap] = useState<
    Map<string, string>
  >(new Map());

  // Force refresh from store on focus, and potentially re-fetch if needed
  useFocusEffect(
    useCallback(() => {
      console.log(
        "[PackModule] Screen focused. Refreshing interactive block status.",
      );

      const refreshInteractiveBlocks = async () => {
        if (!module?.blocks) return;
        const completed = new Set<string>();

        // Check ACTIVITY blocks via store
        if (blockToActivityMap.size > 0) {
          module.blocks.forEach((block) => {
            if (block.type === ContentBlockType.ACTIVITY) {
              const activityId = blockToActivityMap.get(block.id);
              const isComp = activityId
                ? isActivityCompleted(activityId)
                : false;

              console.log(`[PackModule Debug] ACTIVITY Block ${block.id}`, {
                activityId,
                storeSaysCompleted: isComp,
                inCompletedSet: completedInteractiveBlocks.has(block.id),
              });

              if (activityId && isActivityCompleted(activityId)) {
                completed.add(block.id);
              }
            }
          });
        }

        // Check FORM blocks via AsyncStorage
        const formBlocks = module.blocks.filter(
          (b) => b.type === ContentBlockType.FORM,
        );
        for (const block of formBlocks) {
          const key = `pack-${packId}-module-${module.id}-form-${block.id}`;
          const val = await AsyncStorage.getItem(key);
          if (val === "true") {
            completed.add(block.id);
          }
        }

        // Update state if different
        setCompletedInteractiveBlocks((prev) => {
          const prevIds = Array.from(prev).sort().join(",");
          const newIds = Array.from(completed).sort().join(",");
          console.log(
            "[PackModule Debug] Updating completed interactive blocks?",
            prevIds !== newIds,
            newIds,
          );
          return prevIds !== newIds ? completed : prev;
        });
      };

      refreshInteractiveBlocks();
    }, [module, blockToActivityMap, isActivityCompleted, activities, packId]),
  );

  // Animation for progress bar
  const [progressAnim] = useState(new Animated.Value(0));

  const navigateToHomeFallback = useCallback(() => {
    const appNavigation = navigation.getParent();

    if (appNavigation) {
      (appNavigation.navigate as any)("Root", {
        screen: ROUTE_NAMES.HOME,
      });
      return;
    }

    navigation.navigate("Explore" as never);
  }, [navigation]);

  useEffect(() => {
    const initModule = async () => {
      try {
        const targetModuleId = initialModule?.id || initialModuleId;
        if (!targetModuleId) {
          console.error("No module ID provided");
          return;
        }

        startModule(packId, targetModuleId).catch((err) => {
          console.log("Failed to mark start", err);
          if (
            err?.response?.status === 400 &&
            err?.response?.data?.message?.includes("already complete")
          ) {
            alert("This pack is already complete. Optional modules are not accessible after pack completion.");
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigateToHomeFallback();
            }
          }
        });

        if (
          initialModule &&
          initialModule.blocks &&
          initialModule.blocks.length > 0
        ) {
          setModule(initialModule);
          setLoading(false);
          // Track session started — module loaded from nav params
          track(ANALYTICS_EVENTS.PRACTICE_SESSION_STARTED, {
            packId,
            moduleId: initialModule.id,
            moduleTitle: initialModule.title,
            totalBlocks: initialModule.blocks.length,
          });
          return;
        }

        console.log("Fetching module full content via getModule API...");
        let fullModule;
        try {
          fullModule = await getModule(packId, targetModuleId);
        } catch (apiError: any) {
          console.warn(
            "getModule failed (possibly 404), falling back to getPack",
            apiError.message,
          );
          const packData: Pack = await getPack(packId);
          fullModule = packData.modules.find((m) => m.id === targetModuleId);
        }

        if (fullModule) {
          setModule(fullModule);
          // Track session started — module loaded from API
          track(ANALYTICS_EVENTS.PRACTICE_SESSION_STARTED, {
            packId,
            moduleId: fullModule.id,
            moduleTitle: fullModule.title,
            totalBlocks: fullModule.blocks?.length ?? 0,
          });
        } else {
          console.error("Module data is empty/not found even after fallback");
        }
      } catch (err) {
        console.error("Failed to fetch module details", err);
      } finally {
        setLoading(false);
      }
    };

    initModule();
  }, [initialModule, initialModuleId, navigateToHomeFallback, navigation, packId]);

  // Update progress bar when index changes
  useEffect(() => {
    const total = module?.blocks?.length || 1;
    const progress = (currentBlockIndex + 1) / total;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentBlockIndex, module?.blocks, progressAnim]);

  // Load persistent block-to-activity mapping on mount
  useEffect(() => {
    if (!module) return;
    const loadMapping = async () => {
      try {
        const key = `pack-${packId}-module-${module.id}-block-activity-map`;
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          setBlockToActivityMap(new Map(Object.entries(parsed)));
        }
      } catch (error) {
        console.error("Failed to load block-activity mapping:", error);
      }
    };
    loadMapping();
  }, [packId, module?.id]);

  // Save block-to-activity mapping whenever it changes
  useEffect(() => {
    if (!module) return;
    const saveMapping = async () => {
      try {
        const key = `pack-${packId}-module-${module.id}-block-activity-map`;
        const obj = Object.fromEntries(blockToActivityMap);
        await AsyncStorage.setItem(key, JSON.stringify(obj));
      } catch (error) {
        console.error("Failed to save block-activity mapping:", error);
      }
    };
    if (blockToActivityMap.size > 0) {
      saveMapping();
    }
  }, [blockToActivityMap, packId, module?.id]);

  // Synchronize completed interactive blocks with the activity store
  useEffect(() => {
    if (module?.blocks && blockToActivityMap.size > 0) {
      const completed = new Set<string>();
      module.blocks.forEach((block) => {
        if (block.type === ContentBlockType.ACTIVITY) {
          const activityId = blockToActivityMap.get(block.id);
          const isCompleted = activityId
            ? isActivityCompleted(activityId)
            : false;

          if (isCompleted) {
            completed.add(block.id);
          }
        }
      });

      // Merge with existing (preserves FORM completions already in the set)
      setCompletedInteractiveBlocks((prev) => {
        const merged = new Set(prev);
        completed.forEach((id) => merged.add(id));
        const prevIds = Array.from(prev).sort().join(",");
        const mergedIds = Array.from(merged).sort().join(",");
        return prevIds !== mergedIds ? merged : prev;
      });
    }
  }, [activities, module?.blocks, blockToActivityMap, isActivityCompleted]);

  const handleNext = () => {
    if (module?.blocks && currentBlockIndex < module.blocks.length - 1) {
      setCurrentBlockIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex((prev) => prev - 1);
    }
  };

  // Callback for when an activity is created (called by ContentRenderer)
  const handleActivityCreated = useCallback(
    (blockId: string, activityId: string) => {
      console.log(
        "Activity created for block:",
        blockId,
        "with ID:",
        activityId,
      );
      setBlockToActivityMap((prev) => new Map(prev).set(blockId, activityId));
    },
    [],
  );

  // Callback for when a form is completed (called by ContentRenderer)
  const handleFormCompleted = useCallback((blockId: string) => {
    console.log("Form completed for block:", blockId);
    
    // Track form completion
    track(ANALYTICS_EVENTS.ACTIVITY_COMPLETED, {
      packId,
      ...(module?.id ? { moduleId: module.id } : {}),
      blockId,
      type: 'FORM'
    });

    setCompletedInteractiveBlocks((prev) => {
      const next = new Set(prev);
      next.add(blockId);
      return next;
    });
  }, [packId, module?.id]);

  // Completion State
  const [showSuccess, setShowSuccess] = useState(false);
  const [nextModuleId, setNextModuleId] = useState<string | null>(null);

  const handleComplete = async () => {
    if (!module) return;
    try {
      setIsCompleting(true);
      await completeModule(packId, module.id);

      // Check for next module
      try {
        const result = await getPackProgress(packId);
        if (result.packStatus === "COMPLETED") {
          setNextModuleId(null);
        } else {
          const nextMod = result.modules.find(
            (m) => m.orderIndex === module.orderIndex + 1 && m.status === "NOT_STARTED",
          );
          if (nextMod) {
            setNextModuleId(nextMod.moduleId);
          } else {
            setNextModuleId(null);
          }
        }
      } catch (e) {
        console.warn("Failed to find next module", e);
      }

      // Track module completion
      track(ANALYTICS_EVENTS.PRACTICE_SESSION_ENDED, {
        packId,
        moduleId: module.id,
        moduleTitle: module.title,
        completedBlocks: completedInteractiveBlocks.size,
        totalBlocks: module.blocks?.length ?? 0,
      });

      setShowSuccess(true);
    } catch (error) {
      console.error("Failed to complete module", error);
      alert("Failed to complete module. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleFooterAction = () => {
    const currentBlock = blocks[currentBlockIndex];
    const isInteractiveBlock =
      currentBlock?.type === ContentBlockType.ACTIVITY ||
      currentBlock?.type === ContentBlockType.FORM;
    const isBlockCompleted = completedInteractiveBlocks.has(
      currentBlock?.id || "",
    );

    // Check if skipping a mandatory interactive block
    if (isInteractiveBlock && !isBlockCompleted && module?.isMandatory) {
      setShowSkipConfirmation(true);
      return;
    }

    proceedToNext();
  };

  const proceedToNext = () => {
    if (isLastBlock) {
      handleComplete();
    } else {
      handleNext();
    }
  };

  const handleNextModule = () => {
    if (nextModuleId) {
      // Reset state for new module
      setShowSuccess(false);
      setCurrentBlockIndex(0);
      setLoading(true);
      // Navigate to self with new params - essentially resetting the screen
      navigation.replace("PackModule", {
        module: { id: nextModuleId } as any,
        packId,
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerContent]}>
        <ActivityIndicator
          size="large"
          color={theme.colors.actionPrimary.default}
        />
        <Text style={styles.loadingText}>Loading content...</Text>
      </SafeAreaView>
    );
  }

  if (showSuccess) {
    return (
      <SafeAreaView style={styles.successContainer}>
        <LinearGradient
          colors={["#FFF7ED", "#FFF", "#FFF"]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.successContent}>
          <View style={styles.successIconContainer}>
            <LinearGradient
              colors={[
                theme.colors.library.orange[200],
                theme.colors.library.orange[100],
              ]}
              style={styles.iconGradient}
            />
            <MaterialCommunityIcons
              name="trophy"
              size={64}
              color={theme.colors.actionPrimary.default}
            />
          </View>

          <Text style={styles.successTitle}>Module Completed!</Text>
          <Text style={styles.successSubtitle}>
            Great job taking time for your nervous system. You're making real
            progress.
          </Text>

          <View style={styles.successActionContainer}>
            {nextModuleId && (
              <TactileTouchableOpacity
                style={styles.successPrimaryButton}
                onPress={handleNextModule}
              >
                <LinearGradient
                  colors={[
                    theme.colors.actionPrimary.default,
                    "#F97316", // Slightly darker orange for gradient
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.successGradientButton}
                >
                  <MaterialCommunityIcons name="play" size={20} color="white" />
                  <Text style={styles.successPrimaryButtonText}>
                    Start Next Module
                  </Text>
                </LinearGradient>
              </TactileTouchableOpacity>
            )}

            <TactileTouchableOpacity
              style={styles.successSecondaryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.successSecondaryButtonText}>
                Back to Dashboard
              </Text>
            </TactileTouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const blocks = module?.blocks || [];
  const currentBlock = blocks[currentBlockIndex];
  const isLastBlock = currentBlockIndex >= blocks.length - 1;
  const isFirstBlock = currentBlockIndex === 0;

  if (!module) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerContent]}>
        <Text style={styles.emptyText}>Module not found.</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop: 20 }}
        >
          <Text style={{ color: theme.colors.actionPrimary.default }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safeArea}>
      <LinearGradient
        colors={["#FFF7ED", "#FFF", "#FFF"]} // Peach -> White -> White
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View style={styles.header}>
          <TactileTouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color={theme.colors.text.title}
            />
          </TactileTouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>
              MODULE {module.orderIndex}
            </Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {module.title.replace(/^Module \d+:\s*/, "")}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>

        {/* Wizard Content */}
        <View style={styles.contentWrapper}>
          <ScrollView contentContainerStyle={styles.contentContainer}>
            {blocks.length === 0 ? (
              <Text style={styles.emptyText}>
                No content available for this module.
              </Text>
            ) : (
              <View style={styles.stepContainer}>
                <Text style={styles.stepIndicator}>
                  Step {currentBlockIndex + 1} of {blocks.length}
                </Text>
                <ContentRenderer
                  key={currentBlock?.id || currentBlockIndex}
                  block={currentBlock}
                  packId={packId}
                  moduleId={module.id}
                  isMandatory={module.isMandatory}
                  isCompleted={completedInteractiveBlocks.has(
                    currentBlock?.id || "",
                  )}
                  onActivityCreated={handleActivityCreated}
                  onFormCompleted={handleFormCompleted}
                  blockIndex={currentBlockIndex}
                />
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {/* Back Button (Hidden on first step) */}
            <View style={{ flex: 1, opacity: isFirstBlock ? 0 : 1 }}>
              <TactileTouchableOpacity
                style={styles.navButtonSecondary}
                onPress={handleBack}
                disabled={isFirstBlock}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={24}
                  color={theme.colors.text.default}
                />
                <Text style={styles.navButtonTextSecondary}>Back</Text>
              </TactileTouchableOpacity>
            </View>

            <View style={{ flex: 1.5 }}>
              {(() => {
                const isInteractiveBlock =
                  currentBlock?.type === ContentBlockType.ACTIVITY ||
                  currentBlock?.type === ContentBlockType.FORM;
                const isBlockCompleted = completedInteractiveBlocks.has(
                  currentBlock?.id || "",
                );

                // Check interactive block completion FIRST, before checking if it's the last block
                if (isInteractiveBlock && !isBlockCompleted) {
                  return (
                    <TactileTouchableOpacity
                      style={styles.skipButton}
                      onPress={handleFooterAction}
                      activeOpacity={0.7}
                    >
                      <View style={styles.skipButtonContent}>
                        <Text style={styles.skipButtonText}>Skip</Text>
                        {/* Watermark */}
                        <MaterialCommunityIcons
                          name="chevron-double-right"
                          size={56}
                          color={theme.colors.text.default}
                          style={styles.skipButtonWatermark}
                        />
                      </View>
                    </TactileTouchableOpacity>
                  );
                } else if (isLastBlock) {
                  return (
                    <TactileTouchableOpacity
                      style={styles.completeButton}
                      onPress={handleFooterAction}
                      disabled={isCompleting}
                    >
                      <LinearGradient
                        colors={[
                          theme.colors.library.orange[400],
                          theme.colors.library.red[400],
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientButton}
                      >
                        {isCompleting && (
                          <ActivityIndicator
                            color="white"
                            size="small"
                            style={StyleSheet.absoluteFill}
                          />
                        )}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            opacity: isCompleting ? 0 : 1,
                          }}
                        >
                          <MaterialCommunityIcons
                            name="check"
                            size={20}
                            color="white"
                          />
                          <Text style={styles.completeButtonText}>
                            Complete
                          </Text>
                        </View>
                      </LinearGradient>
                    </TactileTouchableOpacity>
                  );
                } else {
                  return (
                    <TactileTouchableOpacity
                      style={styles.nextButton}
                      onPress={handleFooterAction}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={[
                          theme.colors.library.orange[400],
                          theme.colors.library.red[400],
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientButton}
                      >
                        <MaterialCommunityIcons
                          name="play"
                          size={20}
                          color="white"
                        />
                        <Text style={styles.nextButtonText}>Next</Text>
                      </LinearGradient>
                    </TactileTouchableOpacity>
                  );
                }
              })()}
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Skip Confirmation Bottom Sheet */}
      <BottomSheetModal
        visible={showSkipConfirmation}
        onClose={() => setShowSkipConfirmation(false)}
        showCloseButton={true}
        fitContent={true}
      >
        <LinearGradient
          colors={["#FFF7ED", "#FFEDD5"]}
          style={[
            styles.skipModalContainer,
            { paddingBottom: Math.max(24, insets.bottom) },
          ]}
        >
          {/* Watermark */}
          <View style={styles.skipModalWatermark} pointerEvents="none">
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={180}
              color={theme.colors.library.orange[200]}
              style={{ opacity: 0.15, transform: [{ rotate: "15deg" }] }}
            />
          </View>

          {/* Title */}
          <Text style={styles.skipModalTitle}>Skip Recommended Activity?</Text>

          {/* Description */}
          <Text style={styles.skipModalDesc}>
            This exercise is recommended for your progress. Skipping this
            activity may affect the accuracy of your insights.
          </Text>

          {/* Actions */}
          <View style={styles.skipModalActions}>
            <TactileTouchableOpacity
              style={styles.skipModalPrimaryButton}
              onPress={() => {
                setShowSkipConfirmation(false);
                // Defer to next frame so the modal close doesn't collide
                setTimeout(() => proceedToNext(), 350);
              }}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[
                  theme.colors.library.orange[400],
                  theme.colors.library.orange[500],
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.skipModalButtonGradient}
              >
                <Text style={styles.skipModalPrimaryButtonText}>
                  Skip Anyway
                </Text>
              </LinearGradient>
            </TactileTouchableOpacity>

            <TactileTouchableOpacity
              style={styles.skipModalSecondaryButton}
              onPress={() => setShowSkipConfirmation(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.skipModalSecondaryButtonText}>Go Back</Text>
            </TactileTouchableOpacity>
          </View>
        </LinearGradient>
      </BottomSheetModal>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF", // Fallback
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.text.default,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "transparent",
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  headerSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 10,
    textTransform: "uppercase",
    color: theme.colors.text.disabled,
    fontWeight: "700",
    marginBottom: 2,
    textAlign: "center",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 15,
    textAlign: "center",
    color: theme.colors.text.title,
    fontWeight: "600",
  },
  // Progress
  progressContainer: {
    height: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
    width: "100%",
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: theme.colors.library.orange[400],
    borderRadius: 3,
  },
  // Content
  contentWrapper: {
    flex: 1,
    justifyContent: "space-between",
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 24, // Keep reduced bottom padding
  },
  stepContainer: {
    gap: 24,
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text.disabled,
    marginBottom: 8,
    textAlign: "center",
    opacity: 0.8,
  },
  emptyText: {
    textAlign: "center",
    color: theme.colors.text.disabled,
    marginTop: 40,
    ...parseTextStyle(theme.typography.Body),
  },
  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  navButtonSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  navButtonTextSecondary: {
    ...parseTextStyle(theme.typography.Button),
    color: theme.colors.text.default,
    fontWeight: "600",
    fontSize: 15,
  },
  nextButton: {
    borderRadius: 14,
    backgroundColor: "transparent",
    ...parseStyleShadow(theme.shadow.elevation2),
  },
  nextButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },
  skipButton: {
    borderRadius: 14,
    backgroundColor: "#FFF",
    ...parseStyleShadow(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  skipButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
    borderRadius: 14,
    overflow: "hidden",
  },
  skipButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: theme.colors.text.default,
    fontWeight: "600",
    fontSize: 15,
    zIndex: 2,
  },
  skipButtonWatermark: {
    position: "absolute",
    right: -8,
    bottom: -8,
    opacity: 0.06,
    transform: [{ rotate: "15deg" }],
  },
  completeButton: {
    borderRadius: 14,
    backgroundColor: "transparent",
    ...parseStyleShadow(theme.shadow.elevation2),
  },
  gradientButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
    borderRadius: 14,
    overflow: "hidden",
  },
  completeButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },
  // Success Screen Styles
  successContainer: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  successContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  successIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    position: "relative",
    ...parseStyleShadow(theme.shadow.elevation2),
    backgroundColor: "#FFF",
  },
  iconGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 60,
    opacity: 0.1,
  },
  successTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    fontSize: 28,
    textAlign: "center",
    color: theme.colors.text.title,
    marginBottom: 12,
  },
  successSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    textAlign: "center",
    color: theme.colors.text.default,
    marginBottom: 48,
    paddingHorizontal: 16,
    opacity: 0.8,
    lineHeight: 24,
  },
  successActionContainer: {
    width: "100%",
    gap: 16,
  },
  successPrimaryButton: {
    borderRadius: 16,
    backgroundColor: "transparent",
    ...parseStyleShadow(theme.shadow.elevation2),
  },
  successGradientButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
    borderRadius: 16,
    overflow: "hidden",
  },
  successPrimaryButtonText: {
    ...parseTextStyle(theme.typography.Button),
    fontSize: 16,
    color: "white",
    fontWeight: "600",
  },
  successSecondaryButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  successSecondaryButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: theme.colors.text.default,
    fontWeight: "600",
  },
  // Skip Confirmation Modal
  skipModalContainer: {
    padding: 32,
    alignItems: "center",
    paddingBottom: 48,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: "relative",
    overflow: "hidden",
  },
  skipModalWatermark: {
    position: "absolute",
    left: -50,
    top: -30,
    zIndex: 0,
  },
  skipModalTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#111827",
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    zIndex: 1,
  },
  skipModalDesc: {
    ...parseTextStyle(theme.typography.Body),
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    zIndex: 1,
  },
  skipModalActions: {
    width: "100%",
    gap: 12,
    zIndex: 1,
  },
  skipModalPrimaryButton: {
    width: "100%",
    borderRadius: 20,
    ...parseStyleShadow(theme.shadow.elevation2),
  },
  skipModalButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    overflow: "hidden",
  },
  skipModalPrimaryButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
  skipModalSecondaryButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    ...parseStyleShadow(theme.shadow.elevation1),
  },
  skipModalSecondaryButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: theme.colors.text.default,
    fontWeight: "600",
    fontSize: 16,
  },
});

export default PackModuleScreen;
