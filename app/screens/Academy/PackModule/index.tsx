import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import {
  completeModule,
  getModule,
  getPackProgress,
  startModule,
} from "../../../api/packs";
import {
  ContentBlockType,
  PackModule,
  ReferenceBlockContent,
} from "../../../api/packs/types";
import { getProgramGoals } from "../../../api/programGoals";
import { ProgramGoal } from "../../../api/programGoals/types";
import { DailyLog } from "../../Programs/DailyLog";
import { classifyPackError } from "../../../util/packs/packErrors";
import { dayLockMessage, dayCloseLine } from "../../../util/packs/dayLock";
import { ContentRenderer } from "../../../components/Pack/ContentRenderer";
import ScreenView from "../../../components/ScreenView";
import { ROUTE_NAMES } from "../../../constants/routes";
import { useActivityStore } from "../../../stores/activity";
import {
  size,
  radius,
  borderWidth,
  space,
  staggerEntering,
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
  SchemeStatusBar,
} from "../../../design-system";
import { ExploreStackNavigationProp } from "../../../navigators/stacks/ExploreStack/types";
import { track } from "../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../util/analytics/analyticsEvents";
import {
  recordGrowthPointDecline,
  DeclineReason,
} from "../../../api/growthPoints";

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
  const reduceMotion = useReducedMotion();
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
  /**
   * What the day-locked screen is allowed to claim. Null means the progress
   * call failed and the screen falls back to the one thing it can always say
   * truthfully: this day opens later.
   */
  const [lockState, setLockState] = useState<{
    lockedDay: number | null;
    currentDay: number | null;
    nextIncompleteDay: number | null;
    openModuleId: string | null;
    nextDayOpensAt: Date | string | null;
  } | null>(null);
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

  const recordSkip = (reason: DeclineReason) => {
    // IS THIS EVEN A THING WE MEASURE?
    //
    // The dialog fires for FORM blocks too, so a skipped quiz or reflection
    // used to land in the identical avoidance tally as turning down a phone
    // call. A form is not a Growth Point. Deciding that ONCE, here, is what
    // keeps the two records below from disagreeing — an earlier version gated
    // only the new record and left the legacy tally still counting forms, so
    // the leak was half-closed in a way that looked closed.
    const block = blocks[currentBlockIndex];
    const ref =
      block?.type === ContentBlockType.ACTIVITY
        ? (block.content as ReferenceBlockContent)
        : undefined;
    const isMeasurable = !!ref?.refId && !!ref?.activityType;

    if (isMeasurable) {
      // The legacy per-module tally. Only MOTIVATION belongs in the avoidance
      // bucket — "I'd need to be shown how" is a gap in our teaching, not a
      // retreat, so it lands with "not right now".
      const legacyBucket =
        reason === DeclineReason.MOTIVATION ? "tooChallenging" : "notNow";
      setSkipTally((prev) => ({
        ...(prev ?? {}),
        [legacyBucket]: ((prev?.[legacyBucket] as number | undefined) ?? 0) + 1,
      }));

      // The new record. The server independently returns `recorded: false` for
      // anything resolving to no Growth Point, so this is the first of two
      // guards rather than the only one.
      void recordGrowthPointDecline({
        contentType: ref!.activityType!,
        contentId: ref!.refId,
        reason,
        // This screen does not offer a gentler version yet. Reporting the truth
        // matters: claiming an offer we never rendered would make the record
        // read as "we gave them a way down and they still said no".
        easierOffered: false,
      });
    }

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

  /**
   * How far through the ARC this module sits — "3 of 9", not just "3".
   *
   * The header used to read "Module 3 · Step 2 of 5", which answers where you
   * are inside the module and leaves the bigger question open: three of what?
   * A visible finish line is what lets the goal-gradient pull work at all, and
   * it was missing at exactly the moment someone is doing the work.
   *
   * Null until it loads, and null forever if the fetch fails — the label falls
   * back to what it said before rather than blocking the screen. Nobody should
   * be kept from a module because we could not count it.
   */
  const [arc, setArc] = useState<{ total: number } | null>(null);

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

  /**
   * ── THE GOAL GATE ─────────────────────────────────────────────────────────
   * A program asks one question before day 1, and this is where it is asked.
   *
   * IT SITS HERE, not in the callers. Home's recommendation card, the daily
   * plan, DonePractice's "next module" and half a dozen activity screens all
   * navigate straight to PackModule. A check in each of them is a check
   * somebody forgets to add to the seventh one. Every road passes through here.
   *
   * ONCE PER VISIT. `offeredRef` is why backing out of the ask does not bounce
   * you straight back into it. Leaving is allowed: somebody who opened the app
   * to do one module and met a form has to be able to say no. The server still
   * says `needsAsk`, so it is offered again next time they open the program.
   *
   * NEVER BLOCKS. If this request fails the module opens exactly as before. A
   * question about goals must not stand between a person and their practice.
   */
  const offeredRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (offeredRef.current) return;
      let alive = true;
      getProgramGoals(packId)
        .then((state) => {
          if (!alive) return;
          // The report comes first. It is only ever owed once the work is
          // finished, so the two can never both be true, but if a bug ever made
          // them both true, asking for goals from somebody who already has some
          // is the worse mistake.
          if (state.needsReport) {
            offeredRef.current = true;
            navigation.navigate("ProgramGoalsReport", { packId });
            return;
          }
          if (state.needsAsk) {
            offeredRef.current = true;
            navigation.navigate("ProgramGoalsAsk", { packId });
          }
        })
        .catch(() => {
          /* The module opens regardless. */
        });
      return () => {
        alive = false;
      };
    }, [packId, navigation]),
  );

  // The arc position. Deliberately its own effect and its own failure path:
  // it is decoration on the header, and must never delay or break the module.
  useEffect(() => {
    let alive = true;
    getPackProgress(packId)
      .then((p) => {
        if (!alive) return;
        // Only the total. A completed count was stored here and never read —
        // and the label needs the denominator, not the numerator.
        setArc({ total: p.modules.length });
      })
      .catch(() => {
        /* Header falls back to the un-totalled label. Not worth a toast. */
      });
    return () => {
      alive = false;
    };
  }, [packId]);

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
            track(ANALYTICS_EVENTS.PROGRAMS_LIST_OPENED, {
              source: "pack_not_owned",
            });
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
            // Ask what IS open before saying anything. Without this the screen
            // could only guess, and it guessed wrong: it told people today's
            // work was waiting for them at the very moment they had just
            // finished it. The progress endpoint knows the truth and is a
            // separate call, so a 403 on the module does not block it.
            try {
              const progress = await getPackProgress(packId);
              const locked = progress.modules.find(
                (m) => m.moduleId === targetModuleId,
              );
              setLockState({
                lockedDay: locked?.dayIndex ?? null,
                currentDay: progress.currentDay ?? null,
                nextIncompleteDay: progress.nextIncompleteDay ?? null,
                // The module to send them to if there IS open work. Only
                // meaningful when that day is at or behind the clock.
                openModuleId:
                  progress.modules.find(
                    (m) =>
                      m.dayIndex != null &&
                      m.dayIndex === progress.nextIncompleteDay &&
                      m.status !== "COMPLETED" &&
                      m.unlocked !== false,
                  )?.moduleId ?? null,
                nextDayOpensAt: progress.nextDayOpensAt ?? null,
              });
            } catch {
              // Say the vague-but-true thing rather than nothing at all.
              setLockState(null);
            }
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
  /** Handed to DailyLog so it does not refetch what handleComplete just read. */
  const [goalsAfterModule, setGoalsAfterModule] = useState<
    ProgramGoal[] | undefined
  >(undefined);
  const [nextModuleId, setNextModuleId] = useState<string | null>(null);
  /**
   * Set only when the module they just finished was the last OPEN one — i.e.
   * the arc continues but tomorrow is tomorrow. Lets the success screen close
   * the day out loud instead of just quietly dropping the "next" button, which
   * reads as the app having run out of things to say.
   */
  const [dayClose, setDayClose] = useState<{
    finishedDay: number | null;
    nextDay: number | null;
    currentDay: number | null;
    nextDayOpensAt: Date | string | null;
  } | null>(null);

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
          // THE NEXT MODULE IS NOT ALWAYS TODAY'S.
          //
          // On a day-gated pack the module at orderIndex+1 is frequently
          // TOMORROW's — on a one-module-per-day arc it always is. Offering it
          // sent the user straight into the day-locked screen, one tap after
          // finishing, on a button we drew ourselves. `unlocked` is what the
          // backend has always said about that; read it.
          //
          // Only an explicit `false` counts as locked. A backend that doesn't
          // send the field leaves this exactly as it was.
          if (nextMod && nextMod.unlocked !== false) {
            setNextModuleId(nextMod.moduleId);
          } else {
            setNextModuleId(null);
          }

          // What to say instead. `dayIndex` is this module's own day, so a
          // finished day can close itself honestly rather than going quiet.
          const finishedDay =
            result.modules.find((m) => m.moduleId === module.id)?.dayIndex ??
            null;
          setDayClose(
            nextMod && nextMod.unlocked === false
              ? {
                  finishedDay,
                  nextDay: nextMod.dayIndex ?? null,
                  currentDay: result.currentDay ?? null,
                  // How long the wait is, not the word "tomorrow" — which is
                  // wrong for anyone finishing a day after midnight, and wrong
                  // anyway because the gate is 24h from the start.
                  nextDayOpensAt: result.nextDayOpensAt ?? null,
                }
              : null,
          );
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

      // ── THE REPORT IS THE LAST DAY'S ENDING ────────────────────────────
      // A program that asked for goals does not close on the last module. It
      // closes when the user says what happened to each one, and this is the
      // moment to ask: they are still here, and they have just finished.
      //
      // `replace`, not `navigate`, so "Done" on the report lands where the
      // module was entered from rather than back on a finished module.
      //
      // Wrapped and swallowed: a failure here shows the ordinary success screen
      // and the goal gate catches them next time. Finishing a module must never
      // fail because we could not fetch a question.
      try {
        const goalState = await getProgramGoals(packId);
        setGoalsAfterModule(goalState.goals);
        if (goalState.needsReport) {
          navigation.replace("ProgramGoalsReport", { packId });
          return;
        }
      } catch {
        /* Fall through to the normal success screen. */
      }

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
        <SchemeStatusBar />
        <View style={styles.centerFill}>
          <Spinner label="Loading content..." />
        </View>
      </ScreenView>
    );
  }

  // Owned, but this day hasn't opened yet. NOT a purchase prompt — they have
  // already paid; the only thing between them and the content is the calendar.
  if (dayLocked) {
    const lockMessage = dayLockMessage(lockState);
    // A finished day gets the check; a day they still owe gets the hourglass.
    // Neither is a padlock: nothing is being withheld either way.
    const lockedIsDone = lockMessage.action === "leave" && !!lockState;

    return (
      <ScreenView style={{ backgroundColor: colors.background.canvas }}>
        <SchemeStatusBar />
        <View style={styles.lockedFill}>
          <Animated.View
            entering={staggerEntering(0, reduceMotion)}
            style={[
              styles.lockedGlyph,
              {
                backgroundColor: colors.surface.control,
                borderColor: colors.border.default,
              },
            ]}
          >
            <Icon
              name={lockedIsDone ? icons.success : icons.soon}
              size={size.iconLg}
              color={colors.text.secondary}
            />
          </Animated.View>

          <Animated.View
            entering={staggerEntering(1, reduceMotion)}
            style={styles.lockedCopy}
          >
            <Text variant="h2" color="primary" center>
              {lockMessage.title}
            </Text>
            <Text variant="body" color="secondary" center>
              {lockMessage.body}
            </Text>
          </Animated.View>

          <Animated.View
            entering={staggerEntering(2, reduceMotion)}
            style={styles.lockedAction}
          >
            <Button
              label={lockMessage.actionLabel}
              fullWidth={false}
              onPress={() => {
                if (
                  lockMessage.action === "catchUp" &&
                  lockState?.openModuleId
                ) {
                  // `replace`, not push: the locked day is not somewhere they
                  // should be able to swipe back into.
                  navigation.replace("PackModule", {
                    module: { id: lockState.openModuleId } as any,
                    packId,
                  });
                  return;
                }
                navigation.canGoBack()
                  ? navigation.goBack()
                  : navigateToHomeFallback();
              }}
            />
          </Animated.View>
        </View>
      </ScreenView>
    );
  }

  if (showSuccess) {
    return (
      <ScreenView style={{ backgroundColor: colors.background.canvas }}>
        <SchemeStatusBar />
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

          {/* WHY THE DAY CLOSES ITSELF HERE.
              The arc continues but tomorrow is tomorrow, so there is no "next"
              button to offer. Saying nothing looked like the app running out
              of things to say, and the button we used to show instead led
              straight to a locked screen that told them today's work was still
              waiting. This is the honest version of that button. */}
          {dayClose ? (
            <Text
              variant="body"
              color="accent"
              center
              style={styles.successDayClose}
            >
              {dayCloseLine(dayClose)}
            </Text>
          ) : null}

          {/* The day's work is done and they are already stopped here. Asking
              at the START of a module would delay the thing they opened the
              app to do, and after the LAST module this screen is replaced by
              the report, so the two never collide. */}
          <DailyLog packId={packId} goals={goalsAfterModule} />

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
        <SchemeStatusBar />
        <View style={styles.centerFill}>
          <Text variant="body" color="secondary" center>
            Module not found.
          </Text>
          <Button
            label="Go Back"
            variant="ghost"
            fullWidth={false}
            onPress={() => navigation.goBack()}
          />
        </View>
      </ScreenView>
    );
  }

  const moduleTitle = module.title.replace(/^Module \d+:\s*/, "");
  // "Module 3 of 9" once we know the total; "Module 3" until then, which is
  // exactly what it said before — so a slow or failed count costs nothing.
  const modulePosition = arc
    ? `Module ${module.orderIndex} of ${arc.total}`
    : `Module ${module.orderIndex}`;
  const progressLabel =
    blocks.length === 0
      ? modulePosition
      : `${modulePosition} · Step ${currentBlockIndex + 1} of ${blocks.length}`;

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
        color={colors.text.accent}
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
              size={size.iconLg}
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
            No problem. It just helps to know why, so your progress reflects
            what actually happened.
          </Text>

          {/*
            THE WORDING IS THE MECHANISM.

            The evidence on sensitive questions is specific: face-saving ANSWER
            OPTIONS work, reassuring preambles largely don't. So each option is
            written to be a comfortable thing to pick, with the justification
            built into it.

            "This one's too big a jump right now" replaced "It felt too hard".
            Same information, but it blames the TASK rather than the person —
            "too hard" asks someone to admit the thing they are most ashamed
            of, and would systematically under-report the single answer that
            matters most.

            Three options, not two, because a decline has three causes and only
            one of them is avoidance. Someone who has not been taught the
            technique yet is not retreating, and counting them as if they were
            penalises us for our own gap.
          */}
          <View style={styles.skipModalActions}>
            <Button
              label="Too big a jump right now"
              onPress={() => recordSkip(DeclineReason.MOTIVATION)}
            />
            <Button
              label="I'd need to be shown how first"
              variant="secondary"
              onPress={() => recordSkip(DeclineReason.CAPABILITY)}
            />
            <Button
              label="Today's not the day"
              variant="secondary"
              onPress={() => recordSkip(DeclineReason.OPPORTUNITY)}
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
    gap: space.sectionGap,
  },
  // Day-locked state. Same centred fill, but composed as three groups
  // (glyph, copy, action) so the gaps say what belongs together.
  lockedFill: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: space.screenX,
    // Dead centre reads LOW on an otherwise empty screen. Reserving a little
    // more room below than above puts the group on the optical centre.
    paddingBottom: spacing["6xl"],
  },
  lockedGlyph: {
    width: size.control,
    height: size.control,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: borderWidth.hairline,
    marginBottom: space.sectionGap,
  },
  lockedCopy: {
    alignItems: "center",
    gap: spacing.sm,
    // Measure, not gutter: centred prose past ~320 gets hard to track back to
    // the start of the next line. The screen gutter stays screenX.
    maxWidth: 320,
  },
  lockedAction: {
    // A deliberate step between "what happened" and "what to do", bigger than
    // the gaps inside the copy group, so the button reads as a separate move.
    marginTop: spacing["3xl"],
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
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing["3xl"],
  },
  successDayClose: {
    marginBottom: spacing["2xl"],
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
    borderRadius: radius.full,
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
