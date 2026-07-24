import React, { useCallback, useRef, useState } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getPackBrochure, getPackProgress, getRecommendedPack } from "../../api/packs";
import { PackProgress, PackRecommendation } from "../../api/packs/types";
import { useUserStore } from "../../stores/user";
import PressableScale from "../PressableScale";
import PriceTag from "../PriceTag";
import ErrorStateCard from "./ErrorStateCard";
import {
  Sheet,
  Text,
  Button,
  Icon,
  icons,
  Spinner,
  useTheme,
  makeStyles,
  withAlpha,
  spacing,
  space,
  radius,
} from "../../design-system";

interface SmartRecommendationCardProps {
  style?: StyleProp<ViewStyle>;
}

const SmartRecommendationCard = ({ style }: SmartRecommendationCardProps) => {
  const { colors, scheme } = useTheme();
  const styles = useStyles();
  const exploreNavigation = useNavigation<any>();
  // Whether Home is ALSO showing the onboarding reminder card. We only defer to
  // it (render nothing) when it is actually there — see the NEEDS_ONBOARDING
  // branch below. A dev/edge user flagged onboarded but with no signals would
  // otherwise fall between the two and leave a hole on Home.
  const reminderCardWillShow = useUserStore(
    (s) => !!s.user && !s.user.hasCompletedOnboarding,
  );
  const [recommendation, setRecommendation] =
    useState<PackRecommendation | null>(null);
  const [progress, setProgress] = useState<PackProgress | null>(null);
  /**
   * Module outline from the brochure, used only when the recommendation itself
   * arrived without modules. Titles, ordering and count — never block content.
   */
  const [moduleOutline, setModuleOutline] = useState<
    { id: string; orderIndex: number; title: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastFetchRef = useRef<number>(0);
  // Deferred navigation: the "Ready to start?" sheet closes first, then navigates
  // on full dismissal so it never lingers over the pushed screen.
  const pendingStartRef = useRef(false);
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
          // The BROCHURE, not getPack. This card only needs the module count
          // and ordering to draw a progress ratio, and getPack is owners-only
          // now — calling it here would 402 for exactly the users a
          // recommendation is meant to reach.
          //
          // Kept in its own state rather than assigned onto `rec.pack.modules`:
          // a brochure module has no `description` and no `blocks`, so pushing
          // it into a PackModule[] would be a cast that quietly claims content
          // is present. Anything that later reached for `.blocks` would find
          // undefined at runtime while the types said otherwise.
          const brochure = await getPackBrochure(rec.pack.id);
          if (brochure?.modules) {
            setModuleOutline(brochure.modules);
          }
        } catch (err) {
          console.error("Failed to fetch pack brochure outline", err);
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
      // `&& !loading` used to be here and made this throttle DEAD CODE.
      // fetchRecommendations is useCallback(..., []) — permanently stable — so
      // this callback was built once, on the first render, capturing `loading`
      // at its initial `true` forever. `!loading` was therefore always false,
      // the guard never returned early, and every single focus refetched.
      //
      // Two consequences, both live: two API calls on every return to Home for
      // the whole session, and — because a refetch sets error on failure while
      // never setting loading back to true — one flaky request silently
      // replaced a perfectly good recommendation with the error card.
      //
      // lastFetchRef starts at 0, so the first focus still fetches (Date.now()
      // minus 0 dwarfs the threshold). No `loading` needed.
      const timeSinceLastFetch = Date.now() - lastFetchRef.current;
      if (timeSinceLastFetch < STALE_THRESHOLD_MS) return;
      fetchRecommendations();
    }, [fetchRecommendations]),
  );

  const handleFindNext = async () => {
    setIsRefreshing(true);
    await fetchRecommendations();
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <Spinner />
      </View>
    );
  }

  if (error) {
    return (
      <ErrorStateCard
        onRetry={handleFindNext}
        style={{ marginVertical: spacing.lg }}
      />
    );
  }

  if (!recommendation) {
    return null;
  }

  // ── NOTHING TO PRACTISE — but WHY decides what we say ──────────────────
  //
  // This card used to render one green "Today's work is done" panel for every
  // no-pack case. Once every pack became paid, the recommender (which ranks
  // only OWNED packs) returned nothing for every free user — so the app told
  // people who had done nothing that their work was done, over a CTA wearing
  // the Explore TAB's icon. The server now says which situation this is.
  if (!recommendation.pack) {
    // A. No onboarding signal — we cannot honestly match anyone. When Home is
    // showing the onboarding reminder card, defer to it: a second CTA here
    // would compete with it, and a "matched to you" claim would be invented.
    // But ONLY defer when that card is actually present — a user flagged
    // onboarded yet carrying no signals (a dev/edge state) has no reminder
    // card, so returning null would leave a hole. Fall through to the neutral
    // browse card instead.
    if (recommendation.state === "NEEDS_ONBOARDING" && reminderCardWillShow) {
      return null;
    }

    const pick = recommendation.topPick;

    // B. Owns everything they bought and finished it — genuinely caught up.
    // This is the ONLY case where "today's work is done" is true.
    if (recommendation.state === "ALL_COMPLETE" && !pick) {
      const ink = colors.accentOn.success;
      return (
        <View
          style={[styles.container, { shadowColor: colors.shadow }, style]}
        >
          <View
            style={[
              styles.gradient,
              styles.gradientCentered,
              { backgroundColor: colors.accent.success },
            ]}
          >
            <View style={styles.watermarkMain} pointerEvents="none">
              <Icon name={icons.success} size={140} color={withAlpha(ink, 0.1)} />
            </View>
            <View style={styles.caughtUpContent}>
              <Text variant="h2" color={ink} center>
                Today&apos;s work is done
              </Text>
              <Text variant="body" color={ink} center style={styles.caughtUpBody}>
                You&apos;ve been through everything you own. Come back tomorrow.
              </Text>
            </View>
          </View>
        </View>
      );
    }

    // C. No specific suggestion we can stand behind — but NEVER render nothing.
    //
    // A card that silently disappears is worse than the wrong card: Home just
    // ends up with a hole in it and no one can tell whether that's a bug or a
    // state. This branch catches an older backend (one that predates `state`
    // and `topPick`), a response shape we don't recognise, and the case where
    // signals exist but nothing scored as a match. It says only what is always
    // true and points somewhere useful.
    if (!pick) {
      return (
        <PressableScale
          scaleTo={0.98}
          style={[styles.container, { shadowColor: colors.shadow }, style]}
          onPress={() =>
            exploreNavigation.navigate("ExploreStack", { screen: "Programs" })
          }
        >
          <View
            style={[
              styles.gradient,
              styles.gradientCentered,
              { backgroundColor: colors.surface.elevated },
            ]}
          >
            <View style={styles.watermarkMain} pointerEvents="none">
              <Icon
                name={icons.roadmap}
                size={140}
                color={withAlpha(colors.text.primary, 0.06)}
              />
            </View>
            <View style={styles.caughtUpContent}>
              <Text variant="h2" color="primary" center>
                Find your next program
              </Text>
              <Text
                variant="body"
                color="secondary"
                center
                style={styles.caughtUpBody}
              >
                Guided, day-by-day plans for the situations that feel hardest.
              </Text>
              <View style={[styles.cta, { borderColor: colors.text.primary }]}>
                <Icon
                  name={icons.roadmap}
                  size={14}
                  color={colors.text.primary}
                />
                <Text variant="title" color="primary">
                  Browse programs
                </Text>
              </View>
            </View>
          </View>
        </PressableScale>
      );
    }

    // D. A real, signal-backed program to suggest — show it properly.
    const ink = colors.action.onPrimary;
    return (
      <PressableScale
        scaleTo={0.98}
        style={[styles.container, { shadowColor: colors.shadow }, style]}
        onPress={() =>
          exploreNavigation.navigate("ExploreStack", {
            screen: "ProgramDetail",
            params: { catalogKey: pick.catalogKey, packId: pick.packId },
          })
        }
      >
        <View style={[styles.gradient, { backgroundColor: colors.action.primary }]}>
          <View style={styles.watermarkMain} pointerEvents="none">
            <Icon name={icons.roadmap} size={200} color={withAlpha(ink, 0.1)} />
          </View>

          <View style={styles.pickContent}>
            <Text variant="label" color={ink}>
              {recommendation.state === "ALL_COMPLETE"
                ? "WHAT PAIRS WELL NEXT"
                : "MATCHED TO YOU"}
            </Text>
            <Text variant="h2" color={ink}>
              {pick.title}
            </Text>
            {pick.matchReason ? (
              <Text variant="body" color={ink}>
                {pick.matchReason}
              </Text>
            ) : pick.blurb ? (
              <Text variant="body" color={ink} numberOfLines={2}>
                {pick.blurb}
              </Text>
            ) : null}

            <View style={styles.pickFooter}>
              <PriceTag
                priceInr={pick.priceInr}
                anchorInr={pick.anchorPriceInr}
                compact
              />
              <View style={styles.pickCta}>
                <Text variant="title" color={ink}>
                  See the program
                </Text>
                <Icon name={icons.chevronRight} size={18} color={ink} />
              </View>
            </View>
          </View>
        </View>
      </PressableScale>
    );
  }

  const { pack } = recommendation;

  // Calculate Progress
  // The recommendation normally carries its modules; when it doesn't, fall back
  // to the brochure outline fetched above. Only `id` and `orderIndex` are read
  // below, which is exactly what both shapes have in common.
  // `description` is optional because the brochure deliberately doesn't carry
  // it — the outline sells the shape of the arc, not its contents. It is only
  // ever missing on this fallback path, where the sub-line renders empty rather
  // than wrong.
  const modules: {
    id: string;
    orderIndex: number;
    title: string;
    description?: string;
  }[] = pack.modules && pack.modules.length > 0 ? pack.modules : moduleOutline;

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
    pendingStartRef.current = true;
    setModalVisible(false);
  };

  const ink = colors.action.onPrimary;
  const watermarkIcon = isSafetyMode ? icons.care : icons.energy;

  return (
    <>
      <PressableScale
        scaleTo={0.98}
        style={[styles.container, { shadowColor: colors.shadow }, style]}
        onPress={percentComplete >= 1 ? handleFindNext : handlePress}
        disabled={percentComplete >= 1 && isRefreshing}
      >
        <View style={[styles.gradient, { backgroundColor: colors.action.primary }]}>
          <View>
            {/* 1. Header Section */}
            <View style={styles.headerText}>
              <Text variant="h2" color={ink} style={styles.packTitle}>
                {pack.title}
              </Text>
              <Text variant="body" color={ink}>
                {pack.description}
              </Text>
              {/* Efficacy Badges */}
              {(pack.targetHitRate !== undefined && pack.targetHitRate > 0) && (
                <View style={{ flexDirection: 'row', marginTop: spacing.xs, alignItems: 'center', backgroundColor: withAlpha(colors.surface.default, 0.2), alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.pill }}>
                  <Icon name={icons.star} size={14} color={ink} style={{ marginRight: 4 }} />
                  <Text variant="caption" color={ink} style={{ fontWeight: 'bold' }}>
                    {Math.round(pack.targetHitRate * 100)}% Goal Hit Rate
                  </Text>
                </View>
              )}
            </View>

            {/* Large Watermark Icon */}
            <View style={styles.watermarkMain} pointerEvents="none">
              <Icon name={watermarkIcon} size={220} color={withAlpha(ink, 0.1)} />
            </View>

            {/* 2. Progress Section */}
            <View style={styles.progressSection}>
              <View style={styles.progressLabels}>
                <Text variant="bodySm" color={ink}>
                  Module {nextModuleOrder} of {totalModules}
                </Text>
                <Text variant="bodySm" color={ink}>
                  {Math.round(percentComplete * 100)}%
                </Text>
              </View>
              <View style={[styles.track, { backgroundColor: withAlpha(ink, 0.28) }]}>
                <View
                  style={[
                    styles.fill,
                    { backgroundColor: ink, width: `${percentComplete * 100}%` },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* 3. Next Module card (dark island) or Pack Completion card */}
          {percentComplete >= 1 ? (
            <View style={styles.innerCard}>
              <View style={styles.innerCardContent}>
                <Text variant="label" color="accent">
                  All Caught Up
                </Text>
                <Text variant="h3" color="primary" style={styles.innerTitle}>
                  Great job!
                </Text>
                <Text variant="bodySm" color="secondary">
                  You have completed all your tasks for this pack. Keep going!
                </Text>
              </View>
              <View style={[styles.actionBar, { backgroundColor: scheme === "dark" ? colors.surface.control : colors.surface.inverse }]}>
                {isRefreshing ? (
                  <Spinner size="small" color={colors.action.primary} />
                ) : (
                  <Text variant="label" color="accent">
                    Find Next
                  </Text>
                )}
              </View>
            </View>
          ) : (
            nextModuleDisplay && (
              <View style={styles.innerCard}>
                <View style={styles.innerCardContent}>
                  <Text variant="label" color="accent">
                    Current Module
                  </Text>
                  <Text variant="h3" color="primary" style={styles.innerTitle}>
                    {nextModuleDisplay.title.replace(/^Module \d+:\s*/, "")}
                  </Text>
                  <Text variant="bodySm" color="secondary" numberOfLines={2}>
                    {nextModuleDisplay.description}
                  </Text>
                </View>
                <View style={[styles.actionBar, { backgroundColor: scheme === "dark" ? colors.surface.control : colors.surface.inverse }]}>
                  <Text variant="label" color="accent">
                    {actionButtonText}
                  </Text>
                </View>
              </View>
            )
          )}
        </View>
        {recommendation.isRefresher && (
          <View style={styles.refresherBadge}>
            <Text variant="caption" color={colors.accentOn.success}>
              Refresher
            </Text>
          </View>
        )}
      </PressableScale>

      <Sheet
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onDismissed={() => {
          if (pendingStartRef.current) {
            pendingStartRef.current = false;
            if (nextModuleDisplay) {
              exploreNavigation.navigate("ExploreStack", {
                screen: "PackModule",
                params: { module: nextModuleDisplay, packId: pack.id },
              });
            }
          }
        }}
      >
        <View style={styles.sheetContent}>
          <Text variant="h2" color="primary" center>
            Ready to {actionButtonText}?
          </Text>
          <Text variant="body" color="secondary" center style={styles.sheetSub}>
            {nextModuleDisplay
              ? `${actionGerund}: ${nextModuleDisplay.title}`
              : "Continue your journey"}
          </Text>

          <View style={styles.sheetActions}>
            <Button label={actionButtonText} variant="primary" onPress={handleStartModule} />
            <Button label="Not Now" variant="ghost" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Sheet>
    </>
  );
};

export default React.memo(SmartRecommendationCard);

const useStyles = makeStyles((c) => ({
  container: {
    borderRadius: radius.card,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  loadingContainer: {
    height: 200,
    backgroundColor: c.surface.default,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.card,
  },
  gradient: {
    borderRadius: radius.card,
    overflow: "hidden",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing["3xl"],
    paddingBottom: spacing["2xl"],
  },
  gradientCentered: {
    minHeight: 220,
    justifyContent: "center",
  },
  headerText: {
    zIndex: 1,
    paddingRight: 72,
  },
  packTitle: {
    marginBottom: space.titleSub,
  },
  watermarkMain: {
    position: "absolute",
    top: -20,
    right: -60,
    zIndex: 0,
    transform: [{ rotate: "-15deg" }, { scaleX: -1 }],
  },
  caughtUpContent: {
    alignItems: "center",
    zIndex: 1,
    gap: space.groupGap,
  },
  caughtUpBody: {
    paddingHorizontal: spacing["3xl"],
  },
  // Matched-program showcase (the no-packs-owned / what's-next state).
  pickContent: {
    gap: space.inlineGap,
    zIndex: 1,
  },
  pickFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  pickCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginTop: space.inlineGap,
  },
  progressSection: {
    marginTop: space.sectionGap,
    zIndex: 1,
    gap: space.inlineGap,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  track: {
    height: 6,
    borderRadius: radius.xs,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.xs,
  },
  // Inner module card — a dark island on the bright gradient hero.
  innerCard: {
    backgroundColor: c.surface.elevated,
    borderRadius: radius.card,
    overflow: "hidden",
    marginTop: space.groupGap,
  },
  innerCardContent: {
    padding: spacing["2xl"],
    gap: space.inlineGap,
    position: "relative",
  },
  innerTitle: {
    marginTop: space.titleSub,
    marginBottom: space.titleSub,
  },
  actionBar: {
    backgroundColor: c.surface.control,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: c.border.hairline,
  },
  refresherBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: c.accent.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    zIndex: 10,
  },
  // "Ready to start?" sheet
  sheetContent: {
    gap: space.groupGap,
  },
  sheetSub: {
    marginTop: -space.inlineGap,
  },
  sheetActions: {
    gap: space.rowGap,
    marginTop: space.groupGap,
  },
}));
