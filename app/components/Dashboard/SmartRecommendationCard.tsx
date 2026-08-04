import React, { useCallback, useRef, useState } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getPackBrochure, getPackProgress, getRecommendedPack } from "../../api/packs";
import { PackProgress, PackRecommendation } from "../../api/packs/types";
import { useUserStore } from "../../stores/user";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import PressableScale from "../PressableScale";
import ErrorStateCard from "./ErrorStateCard";
import {
  Sheet,
  Text,
  Button,
  Icon,
  icons,
  Skeleton,
  Spinner,
  useTheme,
  makeStyles,
  withAlpha,
  spacing,
  space,
  radius,
  typography,
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

      // ── Funnel: recommendation_shown ──────────────────────────────────
      // Fired AFTER the (owned-pack) progress fetch, so a progress failure —
      // which routes to catch and renders the error card — never emits a
      // "shown". Mirrors the render branches below so the event never claims a
      // card that isn't shown (the NEEDS_ONBOARDING case defers to the reminder
      // card → renders nothing). Store read imperatively; callback is stable.
      //
      // FUNNEL BREAK, DELIBERATE: `"top_pick"` and `"browse_fallback"` stopped
      // firing on `surface: "home"` when selling moved to ForYouCarousel. Both
      // are now `surface: "home_for_you"`. Any dashboard built on the old pair
      // shows a cliff at this release — expected, not a regression.
      const u = useUserStore.getState().user;
      const reminderWillShow = !!u && !u.hasCompletedOnboarding;
      const variant = rec?.pack
        ? "owned_pack"
        : rec?.state === "NEEDS_ONBOARDING" && reminderWillShow
          ? null
          : rec?.state === "ALL_COMPLETE"
            ? "all_complete"
            : // Everything else renders nothing here now — the carousel has it.
              null;
      if (variant) {
        track(ANALYTICS_EVENTS.RECOMMENDATION_SHOWN, {
          surface: "home",
          variant,
          state: rec?.state ?? null,
          catalogKey: rec?.topPick?.catalogKey ?? null,
          packId: rec?.pack?.id ?? rec?.topPick?.packId ?? null,
          strategy: rec?.strategy ?? null,
          priceInr: rec?.topPick?.priceInr ?? null,
          hasMatchReason: !!rec?.topPick?.matchReason,
          isRefresher: rec?.isRefresher ?? false,
        });
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

  // A ROW, NOT A CARD.
  //
  // This was a 200pt card-shaped box with a spinner in it, reserving room for a
  // card that — for anybody who has not bought a program, which is everybody we
  // are trying to sell to — resolves to `null`. So on every cold open, 200pt of
  // placeholder for nothing sat directly on top of the one shelf on Home that
  // sells, and pushed its price and CTA under the tab dock. The 96pt row still
  // says "something is loading here" and still stops the layout snapping when an
  // owner's real card lands; it just stops claiming space it usually gives back.
  if (loading) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <Skeleton width="55%" height={typography.h3.lineHeight} radius={radius.sm} />
        <Skeleton width="80%" height={typography.bodySm.lineHeight} radius={radius.sm} />
      </View>
    );
  }

  if (error) {
    return (
      // No ad-hoc margin: this sits in the same Home slot as RecHeroCard, whose
      // spacing comes from Page's contentGap.
      <ErrorStateCard onRetry={handleFindNext} style={style} />
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

    // B. Owns everything they bought and finished it — genuinely caught up.
    //
    // The condition used to be `ALL_COMPLETE && !topPick`, because the deleted
    // branch D showed the pick under a "WHAT PAIRS WELL NEXT" eyebrow instead.
    // With selling moved to the carousel, whether a pick exists says nothing
    // about whether today's work is done — and keeping the clause left a HOLE:
    // someone who had finished everything AND owned everything got null from
    // here and a hidden carousel, so Home had a blank where a card belongs.
    if (recommendation.state === "ALL_COMPLETE") {
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

    // C/D. SELLING MOVED OUT OF THIS COMPONENT.
    //
    // Two branches lived here: a "MATCHED TO YOU" hero for `topPick`, and a
    // neutral "Find your next program" fallback. Both are now `ForYouCarousel`,
    // which shows THREE ranked programs instead of one — the backend has always
    // returned all ten with the runners-up tagged `"strong"`, and nothing read
    // that field.
    //
    // They had to move rather than coexist: keeping the hero here AND showing
    // the same pack as slide 1 renders it twice, and the obvious dodge —
    // starting the carousel at `items[1]` — is exactly the positional shortcut
    // `util/packs/offers.ts` forbids after it once shipped the wrong pack at
    // the wrong price.
    //
    // The "never render nothing" rule above still holds; the carousel owns it
    // now, and renders the same neutral browse card when it has nothing.
    return null;
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
                {/*
                  NEVER OPEN ON A ZERO.

                  A fresh pack showed "Module 1 of 9" beside a flat "0%". The
                  position is a statement about a journey; the zero is a
                  statement about emptiness, and it is the first thing someone
                  sees after paying. The pre-stamped loyalty card reached 34%
                  completion against 19% for an empty one — identical purchases,
                  the difference was entirely in not starting at nothing.

                  This does not invent credit, which would be the dishonest
                  version. It just stops announcing the absence of it: the empty
                  bar already says "not started" without putting a number on it.
                */}
                {percentComplete > 0 ? (
                  <Text variant="bodySm" color={ink}>
                    {Math.round(percentComplete * 100)}%
                  </Text>
                ) : null}
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
    height: 96,
    backgroundColor: c.surface.default,
    justifyContent: "center",
    gap: space.inlineGap,
    paddingHorizontal: space.cardPad,
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
