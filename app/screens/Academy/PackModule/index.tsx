import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import {
  completeModule,
  getModule,
  getPackProgress,
  startModule,
} from "../../../api/packs";
import { ContentBlockType, PackModule } from "../../../api/packs/types";
import { classifyPackError } from "../../../util/packs/packErrors";
import { ContentRenderer } from "../../../components/Pack/ContentRenderer";
import ScreenView from "../../../components/ScreenView";
import { ROUTE_NAMES } from "../../../constants/routes";
import { useActivityStore } from "../../../stores/activity";
import {
  Button,
  Icon,
  IconName,
  Page,
  ProgressBar,
  Spinner,
  Text,
  icons,
  spacing,
  useTheme,
  Sheet,
} from "../../../design-system";
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

const PackModuleScreen = () => {
  const navigation = useNavigation<ExploreStackNavigationProp<"PackModule">>();
  const route = useRoute<PackModuleScreenRouteProp>();
  const { colors } = useTheme();
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
  /**
   * Owned, but this day of the arc hasn't opened yet (403 PACK_DAY_LOCKED).
   * Kept distinct from "not owned" on purpose: this user has already paid, so
   * showing them a purchase prompt would be both wrong and insulting.
   */
  const [dayLocked, setDayLocked] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);
  /**
   * Why this user skipped exposure challenges in THIS module, tallied as they
   * go and sent once on completion. Accumulated rather than sent per skip
   * because the backend records exposures per module, not per activity — and
   * because a half-finished module that is abandoned should leave no trace.
   *
   * Stays null until they actually answer. Sending `{}` would read as "zero
   * avoidance" on the backend rather than "unknown", which is worse than
   * sending nothing at all.
   */
  const [skipTally, setSkipTally] = useState<{
    tooChallenging?: number;
    notNow?: number;
    eased?: number;
  } | null>(null);

  const recordSkip = (reason: "tooChallenging" | "notNow") => {
    setSkipTally((prev) => ({
      ...(prev ?? {}),
      [reason]: ((prev?.[reason] as number | undefined) ?? 0) + 1,
    }));
    setShowSkipConfirmation(false);
    // Defer so the sheet's close animation doesn't collide with navigation.
    setTimeout(() => proceedToNext(), 350);
  };

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
        // NO FALLBACK. This used to catch every error and retry with getPack,
        // which returned modules WITHOUT blocks — so a "you haven't bought
        // this" refusal rendered as a real pack title, a progress bar reading
        // "1 of 1" (nothing to count), and "No content available". A paywall
        // that looks like a broken screen is worse than either. getPack is now
        // owners-only server-side, so there is nothing to fall back to.
        let fullModule;
        try {
          fullModule = await getModule(packId, targetModuleId);
        } catch (apiError: any) {
          // Shared classifier, so this screen and ContentRenderer cannot drift
          // apart on what a refusal means. Tested in util/packs/__tests__.
          const kind = classifyPackError(apiError);

          // They don't own the pack. Send them where they can buy it —
          // Programs lives in the Explore tab's stack, reached through the
          // parent navigator the same way navigateToHomeFallback does.
          if (kind === "NOT_OWNED") {
            const appNavigation = navigation.getParent();
            if (appNavigation) {
              (appNavigation.navigate as any)("Root", {
                screen: ROUTE_NAMES.EXPLORE,
                params: { screen: "Programs" },
              });
            } else {
              navigation.navigate("Explore" as never);
            }
            return;
          }

          // They DO own it, this day just hasn't unlocked yet. Different
          // situation, different answer — never a purchase prompt.
          if (kind === "DAY_LOCKED") {
            setDayLocked(true);
            return;
          }

          // Anything else is a genuine failure and must surface as one rather
          // than as an empty screen.
          throw apiError;
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
      // skipTally is null unless they answered the "why" question, and null is
      // the honest signal for "unknown" -- see completeModule.
      await completeModule(packId, module.id, skipTally);

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
      <ScreenView style={{ backgroundColor: colors.background.canvas }}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centerFill}>
          <Spinner label="Loading content..." />
        </View>
      </ScreenView>
    );
  }

  // Owned, but this day hasn't opened yet. NOT a purchase prompt — they have
  // already paid; the only thing between them and the content is the calendar.
  if (dayLocked) {
    return (
      <ScreenView style={{ backgroundColor: colors.background.canvas }}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centerFill}>
          <Text variant="h2" color="primary" center>
            Not yet
          </Text>
          <Text variant="body" color="secondary" center>
            This day of the programme opens later. Today&apos;s work is waiting
            for you on the pack page.
          </Text>
          <Button
            label="Back to the pack"
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigateToHomeFallback()
            }
          />
        </View>
      </ScreenView>
    );
  }

  if (showSuccess) {
    return (
      <ScreenView style={{ backgroundColor: colors.background.canvas }}>
        <StatusBar barStyle="light-content" />
        <View style={styles.successContent}>
          <View
            style={[
              styles.successIconContainer,
              { backgroundColor: colors.action.primaryTint },
            ]}
          >
            <Icon
              name={icons.milestone}
              size={56}
              color={colors.text.accent}
            />
          </View>

          <Text variant="h1" color="primary" center>
            Module Completed!
          </Text>
          <Text
            variant="body"
            color="secondary"
            center
            style={styles.successSubtitle}
          >
            Great job taking time for your nervous system. You're making real
            progress.
          </Text>

          <View style={styles.successActionContainer}>
            {nextModuleId && (
              <Button
                label="Start Next Module"
                leftIcon={icons.play}
                onPress={handleNextModule}
              />
            )}
            <Button
              label="Back to Dashboard"
              variant="ghost"
              onPress={() => navigation.goBack()}
            />
          </View>
        </View>
      </ScreenView>
    );
  }

  const blocks = module?.blocks || [];
  const currentBlock = blocks[currentBlockIndex];
  const isLastBlock = currentBlockIndex >= blocks.length - 1;
  const isFirstBlock = currentBlockIndex === 0;
  const totalBlocks = blocks.length || 1;

  if (!module) {
    return (
      <ScreenView style={{ backgroundColor: colors.background.canvas }}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centerFill}>
          <Text variant="body" color="secondary" center>
            Module not found.
          </Text>
          <Button
            label="Go Back"
            variant="ghost"
            onPress={() => navigation.goBack()}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </ScreenView>
    );
  }

  const moduleTitle = module.title.replace(/^Module \d+:\s*/, "");
  const progressLabel =
    blocks.length === 0
      ? `Module ${module.orderIndex}`
      : `Module ${module.orderIndex} · Step ${currentBlockIndex + 1} of ${blocks.length}`;

  // Footer action button — mirrors the legacy Skip / Complete / Next logic.
  const isInteractiveBlock =
    currentBlock?.type === ContentBlockType.ACTIVITY ||
    currentBlock?.type === ContentBlockType.FORM;
  const isCurrentBlockCompleted = completedInteractiveBlocks.has(
    currentBlock?.id || "",
  );

  let primaryLabel = "Next";
  let primaryIcon: IconName = icons.play;
  let primaryVariant: "primary" | "secondary" = "primary";
  if (isInteractiveBlock && !isCurrentBlockCompleted) {
    primaryLabel = "Skip";
    primaryIcon = icons.chevronRight;
    primaryVariant = "secondary";
  } else if (isLastBlock) {
    primaryLabel = "Complete";
    primaryIcon = icons.success;
  }

  return (
    <Page
      title={moduleTitle}
      description={progressLabel}
      onBack={() => navigation.goBack()}
      keyboardAvoiding
      footer={
        <View style={styles.footerRow}>
          {!isFirstBlock ? (
            <Button
              label="Back"
              variant="ghost"
              leftIcon="chevron-left"
              fullWidth={false}
              onPress={handleBack}
              style={styles.footerBack}
            />
          ) : (
            <View style={styles.footerBack} />
          )}
          <View style={styles.footerPrimary}>
            <Button
              label={primaryLabel}
              variant={primaryVariant}
              leftIcon={primaryIcon}
              loading={isCompleting}
              onPress={handleFooterAction}
            />
          </View>
        </View>
      }
    >
      <ProgressBar
        value={currentBlockIndex + 1}
        max={totalBlocks}
        color={colors.action.primary}
      />

      {blocks.length === 0 ? (
        <Text variant="body" color="secondary" center style={styles.emptyText}>
          No content available for this module.
        </Text>
      ) : (
        // Pack blocks are now DS-native (dark cards / light-on-dark reading copy),
        // so they render directly on the dark canvas — no light reading sheet.
        <ContentRenderer
          key={currentBlock?.id || currentBlockIndex}
          block={currentBlock}
          packId={packId}
          moduleId={module.id}
          isMandatory={module.isMandatory}
          isCompleted={completedInteractiveBlocks.has(currentBlock?.id || "")}
          onActivityCreated={handleActivityCreated}
          onFormCompleted={handleFormCompleted}
          blockIndex={currentBlockIndex}
        />
      )}

      {/* Skip Confirmation Bottom Sheet */}
      <Sheet
        visible={showSkipConfirmation}
        onClose={() => setShowSkipConfirmation(false)}
      >
        <View style={styles.skipModalContainer}>
          <View
            style={[
              styles.skipModalIcon,
              { backgroundColor: colors.accentTint.warning },
            ]}
          >
            <Icon
              name={icons.warning}
              size={28}
              color={colors.feedback.warningText}
            />
          </View>

          <Text variant="h2" center>
            Skipping this one?
          </Text>

          {/*
            ASK WHY — the answer changes what this means clinically.

            The Courage approach rate is completed / (completed + avoidance).
            With no answer the backend has to count EVERY skip as avoidance, so
            "I'm on a train" scored exactly like "that felt too frightening".
            These two buttons are the only thing that can tell them apart.

            Neither option is framed as failure, and there is no "Skip Anyway"
            any more: the question is what happened, not whether they should
            feel bad. "Not right now" is explicitly NOT counted against them.
          */}
          <Text variant="body" color="secondary" center>
            No problem — it just helps to know why, so your progress reflects
            what actually happened.
          </Text>

          <View style={styles.skipModalActions}>
            <Button
              label="It felt too hard"
              onPress={() => recordSkip("tooChallenging")}
            />
            <Button
              label="Not right now"
              variant="secondary"
              onPress={() => recordSkip("notNow")}
            />
            <Button
              label="Go Back"
              variant="ghost"
              onPress={() => setShowSkipConfirmation(false)}
            />
          </View>
        </View>
      </Sheet>
    </Page>
  );
};

const styles = StyleSheet.create({
  centerFill: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing["3xl"],
  },
  emptyText: {
    marginTop: spacing["4xl"],
  },
  // Footer
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  footerBack: {
    flex: 1,
  },
  footerPrimary: {
    flex: 1.5,
  },
  // Success screen
  successContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["3xl"],
  },
  successIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing["3xl"],
  },
  successSubtitle: {
    marginTop: spacing.md,
    marginBottom: spacing["4xl"],
    paddingHorizontal: spacing.lg,
  },
  successActionContainer: {
    width: "100%",
    gap: spacing.md,
  },
  // Skip Confirmation Modal
  skipModalContainer: {
    alignItems: "center",
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  skipModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  skipModalTitle: {
    marginBottom: spacing.md,
  },
  skipModalDesc: {
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  skipModalActions: {
    width: "100%",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
});

export default PackModuleScreen;
