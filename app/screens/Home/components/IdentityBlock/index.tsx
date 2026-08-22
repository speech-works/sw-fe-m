import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { getLevelStage, LevelStage } from "../../../../api/users";
import PressableScale from "../../../../components/PressableScale";
import { useOpenStudioStore } from "../../../../stores/openStudio";
import { useAvatarSavedStore } from "../../../../stores/avatarSaved";
import { useUserStore } from "../../../../stores/user";
import {
  size,
  useTheme,
  spacing,
  radius,
  Text,
  Icon,
  icons,
  fonts,
  ProgressRing,
} from "../../../../design-system";
import { AvatarSheen } from "./AvatarSheen";
import PriorityCard from "./PriorityCard";
import { usePriorityCard } from "./PriorityCard/usePriorityCard";
import { useStaminaEstimate } from "./useStaminaEstimate";
import { practicesLeftFor } from "../../../../util/functions/stamina";
import { UserAvatar } from "../../../../components/UserAvatar";
import { useOnboardingNudgeStore } from "../../../../stores/onboardingNudge";
import { RingsInfoSheet } from "./RingsInfoSheet";
import { isMember } from "../../../../util/functions/membership";

/**
 * Home's identity block — two sibling cards, one visual grammar:
 *
 *     [ ringed anchor ] LABEL          [ ringed avatar ]  ›
 *     Hero name                        Hero name
 *     status              pct          status              pct
 *
 * The LEVEL card rings its number; the AVATAR card rings the character with the
 * user's ENERGY. That merge is deliberate: energy used to be a full-width bar
 * above these cards, which shouted its most boring value (100%) all day. As a
 * ring it stays glanceable, costs no vertical space, and can ESCALATE — the
 * stroke turns amber at or below `LOW_ENERGY` — so it's quiet when you're fine
 * and loud when you're not. Prominence tracks urgency instead of being fixed.
 *
 * Both rings are the same shape but not the same weight: energy takes the
 * saturated `action.primary` (live, actionable), level the soft `text.accent`
 * (ambient progression). One hue family, separated by lightness — which is also
 * why nothing here competes with the solid-orange practice CTA below.
 *
 * This is the deliberate exception to the program's "horizontal bars, no rings"
 * rule (user directive). Raw XP numbers still live one tap away on Achievements.
 * Level + stamina data flow is ported verbatim from the legacy ResourceStats.
 */

const LEVEL_RING = { size: 34, stroke: 3 };

/**
 * THE AVATAR CARD CARRIES ONE RING, AND BORROWS THE LEVEL CARD'S SKELETON.
 *
 * ENERGY, with the avatar inside it. Both are DS components nested, so neither
 * re-derives any arc maths.
 *
 * IT USED TO CARRY TWO. The outer one was TODAY, segmented by the day's growth
 * axes. It is gone: the segments were nested rather than independent, so one
 * interview filled all three and a reading filled one, and it could not be
 * explained without a legend in the info sheet. See the longer note beside the
 * energy state below.
 *
 * ── THE VERTICAL BUDGET, AND WHY THE TEXT IS ONE ROW ─────────────────────────
 * `cardInner` uses `justify-content: space-between`, so the gap between the
 * anchor and the nameplate IS WHATEVER IS LEFT OVER. It is not a spacing
 * decision; it is a remainder. At minHeight 138 with 16 of padding each side
 * the budget is 106, and two layouts ago the card was spending:
 *
 *   ring 62 + hero 28 + 4 + caption 16  =  110   → 4 OVER. Gap: zero.
 *
 * That was the whole "no gap" defect — nothing left to distribute, and the card
 * silently grew to 142 instead. Shrinking the ring fixed the gap and cost the
 * avatar; it went to 26, which is a silhouette rather than a face.
 *
 * FOLDING THE CAPTION INTO THE HERO ROW IS WHAT PAYS FOR THE AVATAR. One row of
 * 28 instead of 48 frees 20pt, and every one of them goes to the ring:
 *
 *   ring 70 + one row 28                =  98    → 8pt gap, and it fits.
 *
 * 8 is deliberately tight (owner's call): the trade was a bigger character
 * against a roomier column, and the character won. ANY future addition comes
 * out of that 8 — check the sum before adding a line, because `space-between`
 * will not warn you, it will just quietly close up again.
 *
 * ── WHAT THE AVATAR GETS ─────────────────────────────────────────────────────
 *   outer 70 / stroke 2.5  → inner edge at r 32.5
 *   1.5pt of card showing through, which is what separates the two arcs
 *   inner 62 / stroke 2    → inner edge at r 29
 *   avatar 52              → r 26, leaving 3pt of clearance for the ±2pt float
 *
 * 52 is larger than the 46 this card started with, before it carried a second
 * ring at all — so the character is now the biggest it has ever been here, not
 * merely restored.
 */
/** The pre-rings size, kept for the single-ring fallback — see `today` below. */
const SOLO_RING = { size: 62, stroke: 3 };
const SOLO_AVATAR_SIZE = 46;
/** At or below this %, the energy ring switches to the caution hue. */
const LOW_ENERGY = 25;

/**
 * Both rings are the DS `ProgressRing` (its `progress` is 0..1), so level and
 * energy share one implementation and neither re-derives the arc maths.
 *
 * `trackColor` is passed explicitly because the DS default is `surface.row`,
 * which resolves to the same value as `surface.elevated` — these cards' own
 * background — so the track would be invisible here.
 *
 * Both are STATIC. An earlier revision drove `strokeDashoffset` through
 * Reanimated `useAnimatedProps` so the ring would count to its value; the
 * animated props never reached the SVG and both rings rendered stuck at 0%.
 * If the count-in is worth revisiting, verify it on a device BEFORE relying on
 * it — a ring that silently reads 0 is far worse than one that doesn't animate.
 */

export const IdentityBlock: React.FC = () => {
  const { colors, elevation } = useTheme();
  const navigation = useNavigation<any>();
  const { user, fetchUser } = useUserStore();

  // Force-refresh on focus so level/energy are fresh after an activity (frozen).
  useFocusEffect(
    useCallback(() => {
      fetchUser();
    }, [fetchUser]),
  );

  /**
   * The new-avatar greeting. Claimed on focus, because that is the moment the
   * user actually arrives back on Home — the save resolves while the studio is
   * still on screen, and a blade drawn then would be spent behind it.
   *
   * The flag is TAKEN, not read: whether or not we end up drawing anything, the
   * save has been accounted for. Under reduced motion that means the greeting
   * is skipped rather than queued — the studio's "Avatar saved" toast has
   * already done the telling, and a swept band is pure movement with no gentler
   * form to fall back to.
   */
  const reduced = useReducedMotion();
  const takeAvatarSaved = useAvatarSavedStore((s) => s.take);
  const [greeting, setGreeting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const justSaved = takeAvatarSaved();
      if (justSaved && !reduced) setGreeting(true);
    }, [takeAvatarSaved, reduced]),
  );

  /**
   * "Dress your character" from the end of onboarding lands here.
   *
   * That button could not navigate: the studio lives on `AppNavigator`, which
   * did not exist yet when it was pressed. This is the first thing to focus
   * inside the new navigator that both owns the avatar and can navigate, so it
   * honours the request. TAKEN, not read, so a second focus cannot reopen it.
   */
  const takeOpenStudio = useOpenStudioStore((s) => s.take);
  useFocusEffect(
    useCallback(() => {
      if (takeOpenStudio()) navigation.navigate("AvatarStudio");
    }, [takeOpenStudio, navigation]),
  );

  // The priority slot. Fetches on focus with its own stale throttle, and stays
  // null whenever there is nothing to show, so the Level card below is the
  // default rather than a fallback path anyone has to remember to handle.
  const {
    card: priorityCard,
    queued: priorityCardQueued,
    acknowledge: acknowledgePriorityCard,
  } = usePriorityCard();

  const [levelStage, setLevelStage] = useState<LevelStage | null>(null);
  const [isLoadingLevel, setIsLoadingLevel] = useState(true);

  useEffect(() => {
    if (user) {
      setIsLoadingLevel(true);
      getLevelStage()
        .then(setLevelStage)
        .catch((e) => console.error(e))
        .finally(() => setIsLoadingLevel(false));
    } else {
      setIsLoadingLevel(false);
    }
  }, [user?.id, user?.level]);

  const userLevel = levelStage?.level || user?.level || 1;
  const xpIntoLevel = Math.max(
    0,
    (levelStage?.totalXp ?? user?.totalXp ?? 0) - (levelStage?.currentLevelXpFloor || 0),
  );
  const xpForNextLevel = Math.max(
    1,
    (levelStage?.nextLevelXpCeiling || 100) - (levelStage?.currentLevelXpFloor || 0),
  );
  // % progress (not raw XP — those stay one tap away) + the next-level teaser.
  const levelPct = levelStage
    ? Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100))
    : 0;

  /**
   * ── THE TODAY RING IS GONE, DELIBERATELY ──────────────────────────────────
   * This card used to carry a second, outer ring divided into the day's growth
   * axes, plus a "1 of 3" hero line and a legend in the info sheet.
   *
   * It was removed because its three segments were NESTED, not independent:
   * everything that closes Wider also closes Braver, and everything that
   * closes either also closes Regular. So one interview took the ring from 0
   * of 3 to 3 of 3, and a reading took it to 1 of 3. It was a ladder measuring
   * the hardest thing you did, drawn as though it were three separate tasks —
   * which is why it could not be explained without a sheet, and why three
   * attempts at that sheet's wording never made it clearer.
   *
   * It was also one of several surfaces telling somebody about today's
   * practice (the start card beside it, Explore's week and the progress report
   * are the others), and the only one that needed a legend to be read at all.
   * Explore keeps the job: it is where somebody has gone looking, and it lists
   * the actual items rather than categories.
   *
   * What is left is what shipped before any of it: one energy ring, avatar at
   * its full size.
   */

  const [infoOpen, setInfoOpen] = useState(false);
  const growthIntroduced = useOnboardingNudgeStore(
    (s) => s.growthIntroducedAt !== null,
  );
  const markGrowthIntroduced = useOnboardingNudgeStore(
    (s) => s.markGrowthIntroduced,
  );

  /**
   * OPENING IS THE ACKNOWLEDGEMENT — the store's own rule, and the reason this
   * fires here rather than on the sheet's render: a sheet that opened behind
   * something, or was dismissed in half a second, would otherwise burn the one
   * introduction the axis vocabulary gets. Idempotent, so a user who already
   * met the words on the completion screen keeps that earlier timestamp.
   */
  const openInfo = useCallback(() => {
    markGrowthIntroduced();
    setInfoOpen(true);
  }, [markGrowthIntroduced]);

  /**
   * NAVIGATE AFTER THE SHEET IS GONE, NEVER WHILE IT IS OPEN.
   *
   * `Sheet` is a native Modal. Pushing a screen underneath one leaves it
   * hovering over the destination, and stacking a second native Modal on top of
   * it is the documented iOS touch-freeze this codebase already has an
   * `exclusive` prop to avoid. The ref holds the intent; `onDismissed` fires it
   * once the sheet has fully animated out and unmounted.
   */
  const afterSheet = useRef<(() => void) | null>(null);
  const closeSheetThen = useCallback((run: () => void) => {
    afterSheet.current = run;
    setInfoOpen(false);
  }, []);

  const { staminaPercentage, rechargeTimeLeft, estimatedStamina } =
    useStaminaEstimate(user ?? null);

  /**
   * HOW MANY PRACTICES THEY CAN STILL START.
   *
   * Resolved here rather than in the sheet, because this is where the user and
   * the live estimate already are. The sheet shows it and does no arithmetic.
   */
  const practicesLeft = practicesLeftFor(user ?? null, estimatedStamina);
  const isLow = staminaPercentage <= LOW_ENERGY;
  // The per-scheme FOREGROUND cuts, not the fill hues. This value is a ring
  // stroke AND the `%` label beside it, and both are thin marks on a surface:
  // the raw `gamification.stamina` (orange #FF9040) measures 2.02:1 on paper, so
  // the readout failed AA outright and the arc thinned to nothing. `text.accent`
  // is also what the level ring immediately above already uses, so the two rings
  // now agree instead of differing by a token nobody could see the reason for.
  const energyHue = isLow ? colors.accentText.warning : colors.text.accent;

  const hasAvatar = !!user?.avatarManifest;

  /**
   * THE STATUS LINE DESCRIBES ENERGY. ONLY ENERGY.
   *
   * It used to read "Create yours" whenever `avatarManifest` was null — an
   * invitation to make the avatar that was, at that exact moment, rendering
   * three lines above it. `UserAvatar` falls back to `DEFAULT_MANIFEST`, so
   * "no manifest" has never meant "no avatar on screen"; it means "never opened
   * the studio". Every one of those users was being told to create something
   * they could see, in the slot that is supposed to explain the ⚡ figure beside
   * it.
   *
   * Losing the prompt costs nothing: the card's whole surface already opens the
   * studio.
   */
  const energyLabel =
    staminaPercentage === 100
      ? "Charged"
      : rechargeTimeLeft
        ? `~${rechargeTimeLeft} to full`
        : "Recharging…";

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {/* ── The priority slot, or the Level card ── */}
        {/* THE LEVEL CARD IS THE RESTING STATE, not the loser. This slot belongs
            to it, and the server borrows it — rarely — when there is something
            genuinely worth saying. `priorityCard` is null for loading, offline,
            a failed request and every "nothing to say" state alike, because the
            fallback for all of them is identical, so there is nothing here to
            branch on. See PriorityCard/usePriorityCard.ts. */}
        {priorityCard ? (
          <PriorityCard
            card={priorityCard}
            queued={priorityCardQueued}
            onAcknowledge={acknowledgePriorityCard}
          />
        ) : (
        <PressableScale
          onPress={() =>
            navigation.navigate("ProgressDetail", { scrollTo: "achievements" })
          }
          style={[
            styles.card,
            { backgroundColor: colors.surface.elevated, borderColor: colors.border.default },
            elevation.e2,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Level ${userLevel}${
            levelStage?.title ? `, ${levelStage.title}` : ""
          }. ${levelPct}% to level ${userLevel + 1}. View achievements.`}
        >
          <View style={styles.cardInner}>
            {/* top anchor: the level number wrapped in its own progress ring */}
            <View style={styles.levelAnchor}>
              <ProgressRing
                progress={levelPct / 100}
                size={LEVEL_RING.size}
                strokeWidth={LEVEL_RING.stroke}
                color={colors.text.accent}
                trackColor={colors.surface.control}
              >
                <Text
                  variant="body"
                  color="primary"
                  style={styles.ringNumText}
                  numberOfLines={1}
                >
                  {userLevel}
                </Text>
              </ProgressRing>
              <Text variant="eyebrow" color="accent" style={styles.anchorLabel}>
                LEVEL
              </Text>
            </View>

            {/* hero: the stage identity */}
            <View style={styles.heroBlock}>
              <Text variant="h2" color="primary" numberOfLines={1} style={styles.heroName}>
                {isLoadingLevel && !levelStage
                  ? "Syncing…"
                  : levelStage?.title ?? `Level ${userLevel}`}
              </Text>
              <View style={styles.baseline}>
                <Text variant="caption" color="tertiary" numberOfLines={1}>
                  Level {userLevel + 1} next
                </Text>
                <Text variant="caption" color="accent" style={styles.pct}>
                  {levelPct}%
                </Text>
              </View>
            </View>
          </View>
        </PressableScale>
        )}

        {/* ── Avatar card, which is ALSO the energy meter ──
            The character the user owns, ringed by their energy. Always shows a
            REAL avatar (null manifest renders the default), never an empty slot;
            the status line carries create-vs-energy state instead. */}
        {/* ── TWO REGIONS, AND A MISS BETWEEN THEM COSTS NOTHING ──
            This card used to have THREE tap destinations inside 159×138pt: the
            whole surface went to the avatar studio, a 28pt "i" went to the info
            sheet, and the ⚡ figure went to the paywall. Nested targets have no
            gap by definition — the 8pt minimum between adjacent targets cannot
            exist — so a 3pt slip off the "i" did not miss, it navigated
            somewhere unrelated. The target was never too small (28 + 12 hitSlop
            = 52pt, comfortably over 44); the problem was the COST of a miss.

            Now there are two: the ringed avatar opens the studio, and every
            other pixel — including the "i" and the space around it — opens the
            sheet. A near-miss on the "i" lands on the sheet, which is where it
            was going anyway. The ⚡ is no longer a target at all; upgrading
            moved into the sheet, where there is room to say what it buys. */}
        <PressableScale
          onPress={openInfo}
          style={[
            styles.card,
            { backgroundColor: colors.surface.elevated, borderColor: colors.border.default },
            elevation.e2,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Energy ${staminaPercentage} percent, ${energyLabel}. Explains your energy.`}
        >
          <View style={styles.cardInner}>
            {/* THE SAME ANCHOR SHAPE AS THE LEVEL CARD: a ringed thing, then its
                word. `styles.levelAnchor` is reused verbatim rather than copied,
                so the two cards cannot drift apart — the whole point of this
                layout is that they rhyme. */}
            <View style={styles.levelAnchor}>
              {/* THE CHARACTER IS THE DOOR TO THE CHARACTER EDITOR.
                  A 70pt circle — the largest, most distinct object on the card
                  and the only one that is obviously a picture of you rather than
                  a number. It sits inside the card's own pressable, and RN gives
                  the innermost responder the touch, so no propagation guard is
                  needed: hit the ring and you get the studio, miss it by any
                  margin and you get the sheet. */}
              <PressableScale
                haptic={false}
                onPress={() => navigation.navigate("AvatarStudio")}
                accessibilityRole="button"
                accessibilityLabel={
                  hasAvatar
                    ? "Your avatar. Opens the avatar studio."
                    : "Your avatar, not personalised yet. Opens the avatar studio."
                }
              >
                <ProgressRing
                  progress={staminaPercentage / 100}
                  size={SOLO_RING.size}
                  strokeWidth={SOLO_RING.stroke}
                  color={energyHue}
                  trackColor={colors.surface.track}
                >
                  <UserAvatar manifest={user?.avatarManifest} size={SOLO_AVATAR_SIZE} animate />
                </ProgressRing>
              </PressableScale>
            </View>

            {/* ── ONE ROW, WHICH IS WHAT BUYS THE 52pt AVATAR ──
                Two rows cost 48 of the 106; this costs 28, and the 20 saved is
                exactly the ring's increase. The line it replaces was the
                recharge estimate ("~35.3m to full"), which has not been deleted
                — it is in the info sheet, next to the energy ring it describes,
                and in the accessibility label below. It was the least actionable
                thing on the card: nobody schedules around a stamina refill.

                COLOUR-LINKED, and that is the entire legend. The count takes the
                outer ring's green and the ⚡ figure takes the inner ring's
                orange, so the palette says which number belongs to which arc
                without spending a word on it. Colour alone is not an accessible
                signal — that is what the "i" sheet and the label below are for.

                "1 of 3", not "1 of 3 today": the eyebrow says TODAY directly
                above, and the hero must not repeat a word the anchor owns. It
                also keeps this to one line at large text sizes. */}
            <View style={styles.heroRow}>
              <Text
                variant="h2"
                color={colors.text.primary}
                numberOfLines={1}
                style={[styles.heroName, styles.heroCount]}
              >
                Avatar
              </Text>

              {/* NOT A TAP TARGET ANY MORE — a reading.
                  It was briefly the upgrade button, which made it the card's
                  THIRD destination and a 36pt-tall one at that, under the 44
                  minimum. Upgrading now lives in the sheet's energy section,
                  where there is room to say what it actually buys instead of
                  making a percentage secretly clickable. */}
              <View style={styles.energyReadout}>
                <Icon name={icons.energy} size={size.iconXs} color={energyHue} />
                <Text variant="caption" style={[styles.pct, { color: energyHue }]}>
                  {staminaPercentage}%
                </Text>
              </View>
            </View>
          </View>

          {/* THE "i" SITS IN THE CARD'S CORNER, NOT IN THE ANCHOR ROW.
              Inline it was a peer of the ring and ate that row's horizontal
              budget, which is what pushed the TODAY eyebrow off the end. Pinned
              to the corner it reads as chrome — the thing you reach for when you
              want an explanation, and invisible otherwise. It replaces a chevron
              that pointed at the avatar studio, which stopped being what this
              card is about the moment it started reporting today.

              Absolute, so it costs the 106pt budget nothing at all.

              A DOT UNTIL IT HAS BEEN READ, ONCE, EVER. The whole of the
              coach-mark idea and none of its cost: no bubble, no timing, nothing
              to dismiss, and it cannot be missed-once-and-lost because the
              button stays put afterwards. It rides the same `growthIntroducedAt`
              flag every other introduction uses, so anyone who met the words on
              the completion screen never sees it. */}
          <PressableScale
              haptic={false}
              onPress={openInfo}
              // The card underneath is itself pressable, so this needs a real
              // target without a real footprint. 16, not 12, because the box
              // shrank from 28 to 20 when the disc came off: 20 + 32 keeps the
              // 52pt target this always had, rather than landing on 44 exactly.
              hitSlop={spacing.lg}
              accessibilityRole="button"
              accessibilityLabel="What your energy ring means"
              style={styles.infoBtn}
            >
              <Icon name={icons.info} size={size.iconInline} color={colors.text.tertiary} />
              {!growthIntroduced ? (
                <View
                  style={[
                    styles.unread,
                    {
                      // `accentText`, not `accent`. A 9pt dot has no interior to
                      // bound, so it takes the on-surface cut like every other
                      // thin mark: the fill hue measured 1.27:1 on the taupe
                      // disc it used to sit on and 1.77:1 on the bare card,
                      // which is not an unread indicator, it is a rumour.
                      backgroundColor: colors.accentText.success,
                      borderColor: colors.surface.elevated,
                    },
                  ]}
                />
              ) : null}
          </PressableScale>

          {/* Mounted only for the ~1s it takes to cross, so the card carries no
              extra layer for the 99.99% of its life when nothing is being
              celebrated. `styles.card` already clips (overflow: hidden), so the
              blade is cut to the card's corners for free. */}
          {greeting ? (
            <AvatarSheen play onDone={() => setGreeting(false)} />
          ) : null}
        </PressableScale>
      </View>

      {/* Rendered outside the card's PressableScale — a native Modal nested in a
          pressable is a touch-handling trap, and the sheet must outlive any
          press state on the card. */}
      <RingsInfoSheet
          visible={infoOpen}
          onClose={() => setInfoOpen(false)}
          onDismissed={() => {
            const run = afterSheet.current;
            afterSheet.current = null;
            run?.();
          }}
          onEditAvatar={() =>
            closeSheetThen(() => navigation.navigate("AvatarStudio"))
          }
          // Only for free users — a member has nothing to buy here.
          onUpgrade={
            isMember(user)
              ? undefined
              : () => closeSheetThen(() => navigation.navigate("PremiumModal"))
          }
          avatarManifest={user?.avatarManifest}
          staminaPercentage={staminaPercentage}
          practicesLeft={practicesLeft}
          rechargeTimeLeft={rechargeTimeLeft}
          energyHue={energyHue}
          energyLabel={energyLabel}
        />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  // Grid row holding the two identity cards — each takes half the width.
  grid: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  card: {
    flex: 1,
    minHeight: 138,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  // The content column: anchor pinned up top, hero/nameplate at the bottom.
  cardInner: {
    flex: 1,
    justifyContent: "space-between",
  },
  // BOTH cards: ring and its label read as one object, so they stay adjacent.
  // Shared deliberately — the avatar card used to have its own `anchorRow` with
  // `space-between` to push a chevron to the far edge, and that is exactly the
  // divergence that let the two cards stop rhyming.
  levelAnchor: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.sm,
  },
  anchorLabel: {
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  ringNumText: {
    fontFamily: fonts.extrabold,
  },
  heroBlock: {
    gap: spacing.xs,
  },
  heroName: {
    letterSpacing: -0.3,
    fontFamily: fonts.extrabold,
  },
  // Row-only. NOT folded into `heroName`, which the level card also uses inside a
  // COLUMN — where `flexShrink` acts on the vertical axis and would let
  // "Pathfinder" lose height instead of width.
  heroCount: {
    flexShrink: 1,
  },
  baseline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pct: {
    fontFamily: fonts.bold,
  },
  // The avatar card's single text row: the count on the left, the ⚡ figure hard
  // right. `center` rather than `baseline` because the right-hand item is an
  // icon+text pair, and RN derives a View's baseline from its last text child —
  // predictable enough to look wrong at some font scales, and there is nothing
  // to gain over centring two items whose line boxes already differ by 12pt.
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  // bolt + % — one object, so it never wraps apart. `flexShrink: 0` because the
  // count beside it is the item allowed to truncate; a clipped percentage would
  // be a wrong number rather than a shortened phrase.
  energyReadout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 0,
  },
  // Pinned to the card's top-right. `spacing.sm` from each edge rather than the
  // card's own `spacing.lg` padding, because chrome should sit nearer the corner
  // than content does — at 16 it read as a third column of content.
  //
  // NO FILL, AND THAT IS THE WHOLE CHANGE. This used to be a `surface.control`
  // disc, which made it the heaviest single mark in a card whose job is the
  // rings and the two numbers — on paper the taupe is ΔE 16 from the card fill.
  // It was also the app's one bespoke control circle: `IconButton` draws those
  // as a white disc with a `border.strong` hairline, so this matched neither
  // the back button nor itself.
  //
  // A disc was the wrong instrument regardless, because tapping ANYWHERE on
  // this card opens the same sheet (see the two-regions note above). The "i"
  // never was the control. It is a signifier saying the card is explainable,
  // and a filled disc is the visual language of a button.
  //
  // The box survives the fill at `size.icon`: it is what the unread dot hangs
  // off, and at the glyph's own 14 the dot would cover the glyph instead of
  // sitting on its corner. Losing 8pt of box is what moves the mark 4pt nearer
  // the corner, which is the rest of the change.
  infoBtn: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: size.icon,
    height: size.icon,
    alignItems: "center",
    justifyContent: "center",
  },
  // Bordered in the card's own fill so the dot reads as a separate object
  // sitting on the button rather than a notch cut out of it.
  unread: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: radius.full, // a 9pt dot
    borderWidth: 1.5,
  },
});
