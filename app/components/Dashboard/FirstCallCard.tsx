import { useIsFocused, useNavigation } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  SharedValue,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { FirstCallOffer, fetchFirstCallOffer } from "../../api/firstCall";
import {
  Icon,
  Text,
  easing,
  icons,
  radius,
  space,
  spacing,
  useMotion,
  useTheme,
  withAlpha,
} from "../../design-system";
import { isFirstCallQuieted, useFirstCallStore } from "../../stores/firstCall";
import { useUserStore } from "../../stores/user";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import { track } from "../../util/analytics/postHog";
import PressableScale from "../PressableScale";

/**
 * ============================================================================
 * "SOMEONE WANTS TO CALL YOU"
 * ----------------------------------------------------------------------------
 * The doorway to the once-in-a-lifetime first call. It leads with the CALLER,
 * not the feature: a name and a reason to pick up beat any description of what
 * a practice call is, and the whole design rests on it feeling like a person
 * rather than an exercise.
 *
 * It never says free. "Your free call" prices the thing before they have any
 * idea what it is, and invites the question of what it costs next time — on the
 * one screen where we want them thinking about the conversation instead.
 *
 * TWO SHAPES, NEVER ZERO. Somebody who said "not now" gets a quiet card — the
 * same 260pt `PromoCard` shape in the same carousel slot, on a neutral surface
 * with the ringing phone reduced to a watermark. The call is still one tap away
 * in both, because the offer is theirs and nothing on the device may take it
 * back. This renders nothing at all only when the SERVER says there is nothing
 * to offer.
 * ============================================================================
 */

/**
 * THE RINGING — a handset shaking on a table, in bursts.
 *
 * ONE EVENT, TWO EXPRESSIONS. Every "ring" is a single moment in time at which
 * the phone jolts and one ripple leaves it. They are not two animations that
 * have been tuned to look aligned; they are the same number read twice, so
 * they cannot drift apart. The shake is the cause and the ripple is the sound,
 * and the eye will accept nothing else — a ripple that leaves while the phone
 * is still reads as decoration, and decoration on a row somebody sees every day
 * is noise.
 *
 * `pair` and `beat` are a real phone's cadence: two rings close together, then
 * a wait. Six rings per burst, one ripple each, at most two ever in flight.
 *
 * Bursts, not a permanent loop. `active` on, `quiet` off, forever — the pause
 * is what keeps it a signal; something that never stops is wallpaper inside a
 * week, and somebody who deferred sees this row on every single Home open.
 *
 * `lead` is the important number. Nothing may move until the card has finished
 * arriving: motion overlapping its own entrance reads as a rendering glitch
 * rather than a signal. The entrance ends at 430ms (190 delay + 240 travel), so
 * the first ring lands a quarter-second into stillness.
 */
const RINGING = {
  lead: 680,
  active: 5000, // the phone rings for this long
  quiet: 10000, // then nothing at all, for this long
  pair: 1800, // a double-ring starts this often
  beat: 520, // …and the two rings inside it are this far apart
  life: 1100, // one ripple's whole travel, disc edge → max
  shake: 420, // the handset's wobble — over well before the next ring
  // NOT the angle you see. It is the sine's coefficient, and the damping has
  // already taken a third out of it by the time the first quarter-cycle peaks,
  // so the handset actually reaches 9.7° — 35ms in, then 4.4°, 2.0°, 0.9°, 0.4°,
  // rest. Change it by measuring the peak, not by reading this number.
  amp: 14,
  max: 1.5, // half the mark's radius again; the card crops what runs past it
  alpha: 0.32, // light. One ring at a time carries it; it does not need weight
} as const;

/**
 * One full breath of the loop; the clock runs 0 → this, forever.
 *
 * `life` is in there so `quiet` means what it says. The last ring lands just
 * before the 5s mark and its ripple is still travelling for a second after —
 * without it the burst would eat into the silence.
 */
const RINGING_CYCLE = RINGING.active + RINGING.life + RINGING.quiet;

/**
 * Two ripple layers, alternating. Layer L rings at `k * pair + L * beat`, which
 * lays the double-ring cadence out exactly: layer 0 takes 0ms / 1800 / 3600,
 * layer 1 takes 520 / 2320 / 4120. Two is all that is needed — 1800ms between
 * a layer's own rings is far longer than the 1100ms a ripple lives, so a layer
 * can never overlap itself, and only the 520ms pairs ever put two on screen.
 */
const RING_LAYERS = [0, 1];

/** When layer `L`'s most recent ring landed. Negative before its first one. */
function ringLandedAt(clock: number, layer: number) {
  "worklet";
  const offset = layer * RINGING.beat;
  return Math.floor((clock - offset) / RINGING.pair) * RINGING.pair + offset;
}

/**
 * The handset's swing for one layer, in degrees: a damped oscillation, which is
 * what a real object shaken once actually does. It starts and ends at exactly
 * zero, so nothing snaps at either end and no rest position has to be restored.
 * `shake` is shorter than `beat`, so only one layer is ever mid-swing and the
 * two can simply be added.
 */
function ringSwing(clock: number, layer: number) {
  "worklet";
  const landedAt = ringLandedAt(clock, layer);
  if (landedAt < 0 || landedAt >= RINGING.active) return 0;
  const u = (clock - landedAt) / RINGING.shake;
  if (u < 0 || u > 1) return 0;
  return RINGING.amp * Math.exp(-4 * u) * Math.sin(u * 5 * Math.PI);
}

/**
 * One ripple, leaving at the same instant its layer's ring lands. A ring whose
 * turn falls inside the quiet stretch simply never happens, so the burst ends
 * cleanly rather than cutting a ripple off mid-flight.
 */
function useRippleStyle(clock: SharedValue<number>, layer: number) {
  return useAnimatedStyle(() => {
    const hidden = { opacity: 0, transform: [{ scale: 1 }] };
    const landedAt = ringLandedAt(clock.value, layer);
    if (landedAt < 0 || landedAt >= RINGING.active) return hidden;

    const u = (clock.value - landedAt) / RINGING.life;
    if (u < 0 || u > 1) return hidden;

    return {
      // Cubic ease-out: away from the disc quickly, then drifting to a stop.
      transform: [{ scale: 1 + (RINGING.max - 1) * (1 - Math.pow(1 - u, 3)) }],
      // Fades faster than it travels, so it thins out before it nears the text.
      opacity: RINGING.alpha * Math.pow(1 - u, 1.5),
    };
  });
}

/** Entrance delay — the card lands AFTER its Home neighbours have settled, so
 *  the last thing to move on the screen is the thing we want looked at. */
const ENTER_DELAY = 190;

/**
 * The quiet card's watermark: the ring at rest, and the handset inside it.
 *
 * 150 is `PromoCard`'s big ink circle exactly — this mark stands in that slot,
 * so it inherits that size rather than picking a new one. The glyph is a little
 * over half of it, which leaves the ring reading as space around a phone rather
 * than as a badge drawn on top of one.
 */
const MARK = 150;
const MARK_GLYPH = 84;

/**
 * Which of the three shapes this is currently rendering.
 *
 * Both visible shapes are carousel slides, so Home does not need this to place
 * them — it needs it to know whether there is a slide AT ALL. A shape of "none"
 * means the server has nothing to offer, and the slide (and its paging dot) must
 * not be reserved for it. Home guesses synchronously from the same two stores
 * this reads, so nothing waits on the network to lay out; the callback only
 * corrects the guess once the server has actually answered.
 */
export type FirstCallShape = "none" | "quiet" | "hero";

export interface FirstCallCardProps {
  /** Reports the shape being rendered, so Home can place it. */
  onShapeChange?: (shape: FirstCallShape) => void;
}

/**
 * Home's synchronous guess at the shape, from persisted state alone. Mirrors the
 * component's own `alreadyTaken` optimisation — the server still has the final
 * word, delivered through `onShapeChange`.
 */
export function guessFirstCallShape(args: {
  /** Truthiness is all that is read — the field is a Date on the user model. */
  takenAt?: Date | string | null;
  deferredAt: number | null;
}): FirstCallShape {
  if (args.takenAt) return "none";
  return isFirstCallQuieted({ deferredAt: args.deferredAt }) ? "quiet" : "hero";
}

const FirstCallCard: React.FC<FirstCallCardProps> = ({ onShapeChange }) => {
  const navigation = useNavigation<any>();
  const { colors, scheme } = useTheme();
  const isDark = scheme === "dark";
  const [offer, setOffer] = useState<FirstCallOffer | null>(null);

  const takenAt = useUserStore((s) => s.user?.firstCallTakenAt);

  const acceptedPreSignup = useFirstCallStore((s) => s.acceptedPreSignup);
  const clearPreSignup = useFirstCallStore((s) => s.clearPreSignup);
  const deferredAt = useFirstCallStore((s) => s.deferredAt);
  const quiet = isFirstCallQuieted({ deferredAt });

  // Skip the round trip once we already know the answer. Every user is past
  // their first call for the rest of their life, so without this Home pays for
  // a request that can only ever say "no" on every single open. It is an
  // optimisation and nothing more — the offer itself is still the server's
  // call, and a stale/absent field simply means we ask.
  const alreadyTaken = !!takenAt;

  useEffect(() => {
    if (alreadyTaken) return;
    let alive = true;
    (async () => {
      const fresh = await fetchFirstCallOffer();
      if (!alive) return;
      setOffer(fresh);
      if (fresh.available && fresh.scenario) {
        track(ANALYTICS_EVENTS.FIRST_CALL_OFFERED, {
          action: fresh.scenario.action,
          callerName: fresh.scenario.callerName,
          quiet,
        });
      }
    })();
    return () => {
      alive = false;
    };
    // Fetched once per mount; Home remounts this on pull-to-refresh via its key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadyTaken]);

  /**
   * THEY ALREADY SAID YES — BEFORE THEY HAD AN ACCOUNT.
   *
   * The offer is made after Act 1's questions, where there is no session to
   * hold anything, so the answer rode across signup on the device. This is
   * where it is honoured: the first time they reach Home, the phone rings
   * rather than a card appearing that asks them the same question again.
   *
   * Waits for the server's answer rather than trusting the device flag — the
   * flag is an intention, and only `GET /first-call` knows whether there is
   * still a call. Cleared before navigating, and ref-guarded, because a second
   * firing would push a duplicate screen onto the stack.
   */
  const honoured = useRef(false);
  useEffect(() => {
    if (honoured.current || !acceptedPreSignup) return;
    if (!offer) return; // still asking
    honoured.current = true;
    clearPreSignup();
    if (offer.available && offer.scenario) {
      navigation.navigate("FirstCall", { offer });
    }
    // An unavailable offer needs no apology: they never saw a promise that
    // this exact moment would happen, only that the call would come.
  }, [acceptedPreSignup, offer, clearPreSignup, navigation]);

  const scenario = offer?.available ? offer.scenario : undefined;

  // Mirrors the render guards below exactly — `!scenario || alreadyTaken` is
  // the same condition that returns null, so Home can never be told a shape
  // this component is not drawing. Held back until the offer has landed:
  // reporting "none" while the request is still in flight would drop the slide
  // out of the carousel and put it back a moment later.
  const shape: FirstCallShape =
    alreadyTaken || (offer !== null && !scenario)
      ? "none"
      : quiet
        ? "quiet"
        : "hero";
  const pending = !alreadyTaken && offer === null;

  useEffect(() => {
    if (pending) return;
    onShapeChange?.(shape);
  }, [shape, pending, onShapeChange]);

  /**
   * ONE clock drives all three rings. Every ring's radius and opacity is pure
   * arithmetic off it in a worklet, so the rings cannot drift apart and the
   * whole burst costs a single running animation on the UI thread.
   *
   * It stops when Home loses focus. An endless loop ticking away behind three
   * other tabs is invisible battery, and nobody is there to see it — the kind
   * of edge case a user should never have to notice being handled.
   *
   * Under reduced motion there are no rings at all — the same call `PulseDot`
   * makes. Rings leaving an object are pure motion; there is no gentler version
   * to degrade to, and the row still arrives with a fade.
   */
  const { reduced, enter } = useMotion();
  const focused = useIsFocused();
  const clock = useSharedValue(0);
  const ringing = !!scenario && !alreadyTaken && quiet;

  useEffect(() => {
    if (reduced || !ringing || !focused) return;
    clock.value = 0;
    clock.value = withDelay(
      RINGING.lead,
      withRepeat(
        withTiming(RINGING_CYCLE, {
          duration: RINGING_CYCLE,
          easing: easing.linear,
        }),
        -1,
        false
      )
    );
    return () => cancelAnimation(clock);
  }, [reduced, ringing, focused, clock]);

  // Called unconditionally, one per layer — `RING_LAYERS` is a fixed constant,
  // so hook order never changes between renders.
  const ripple0 = useRippleStyle(clock, RING_LAYERS[0]);
  const ripple1 = useRippleStyle(clock, RING_LAYERS[1]);
  const ripples = [ripple0, ripple1];

  // The handset itself. Both layers are summed because only one can be
  // mid-swing at a time — `shake` (420ms) is shorter than `beat` (520ms).
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${
          ringSwing(clock.value, RING_LAYERS[0]) +
          ringSwing(clock.value, RING_LAYERS[1])
        }deg`,
      },
    ],
  }));

  // `alreadyTaken` is re-checked at RENDER, not just before the fetch. Home
  // does not remount this on navigation, so somebody returning straight from
  // their first call would otherwise still see "Maya is trying to reach you"
  // for a call they had just taken — the offer state is from mount, but the
  // user store updated the moment the call completed.
  if (!scenario || alreadyTaken) return null;

  const open = () => navigation.navigate("FirstCall", { offer });

  /**
   * THE QUIET SHAPE IS THE SAME CARD, TURNED DOWN — and it earns that by using
   * the same geometry, not a rebuilt one.
   *
   * An earlier attempt made this a 260pt card by stretching the row's own
   * layout to fit, and it failed for a reason worth keeping written down: the
   * ringing disc, which worked at 46pt BESIDE two lines of text, was left
   * stranded alone in a corner with `space-between` scattering everything else
   * into clumps. A row layout does not become a card layout by being made
   * taller.
   *
   * So it uses `styles.fill` — the literal style object the hero uses, copied
   * from Home's `PromoCard` — and the same title/subtitle/CTA arrangement its
   * carousel neighbours have. The geometry cannot drift between the two shapes
   * because there is only one of it.
   *
   * AND THE DISC BECOMES A WATERMARK. That is what solves the orphaned-glyph
   * problem rather than working around it: at card scale a small solid disc is
   * an object with no job, but a large faint handset is TEXTURE — it takes the
   * place `PromoCard` fills with two ink circles, and unlike those circles it
   * says something. It still rings. The shake and the ripples are unchanged
   * worklets; only their size and opacity moved, because the ripple is pure
   * `scale`/`opacity` and never cared how big it started.
   */
  if (quiet) {
    return (
      <Animated.View entering={enter().delay(ENTER_DELAY)}>
        <PressableScale scaleTo={0.98} onPress={open} style={styles.shadow}>
          <View
            style={[
              styles.fill,
              {
                backgroundColor: colors.surface.default,
                borderColor: colors.border.default,
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            {/* Bottom-right and bleeding off two edges, where the card clips it —
                a watermark that stops short of the corner reads as a picture of
                a phone rather than as the surface being marked. Nothing is laid
                over it: the copy is top-left and the CTA bottom-left, so it never
                has to compete with type for legibility. */}
            <View style={styles.mark} pointerEvents="none">
              {/* Drawn BEFORE the glyph, so each ring is only ever the part that
                  has already travelled past it. Absent entirely under reduced
                  motion, as in `PulseDot`. */}
              {!reduced
                ? ripples.map((style, i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.markRing,
                        { borderColor: withAlpha(colors.accent.warning, 0.5) },
                        style,
                      ]}
                    />
                  ))
                : null}
              {/* Only the handset swings — the rings leave it, they do not carry
                  it. The thing that rings has to be the thing that moves. */}
              <Animated.View style={shakeStyle}>
                <Icon
                  name={icons.phone}
                  size={MARK_GLYPH}
                  color={withAlpha(colors.accent.warning, 0.16)}
                />
              </Animated.View>
            </View>

            <View>
              <Text variant="label" color="tertiary" style={styles.eyebrow}>
                STILL WAITING
              </Text>
              <Text variant="h2" color="primary" style={styles.title}>
                {scenario.callerName} still wants to call
              </Text>
              <Text variant="body" color="secondary">
                Whenever you&apos;re ready. Nothing to prepare.
              </Text>
            </View>

            {/* Filled, not an outline — the same call the programs shelf made for
                its runner-up slides, and for the same reason: an unfilled pill on
                a neutral card is a button you have to look for. It is still a
                clear step below the hero's dark island. */}
            <View
              style={[
                styles.cta,
                {
                  backgroundColor: colors.surface.control,
                  borderColor: colors.border.strong,
                  borderWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Icon name={icons.phone} size={14} color={colors.text.primary} />
              <Text variant="title" color="primary">
                Take the call
              </Text>
            </View>
          </View>
        </PressableScale>
      </Animated.View>
    );
  }

  // AMBER, NOT PURPLE — because this card now shares a carousel with the mood
  // nudge, which IS purple. Two identical fills one swipe apart read as the
  // same card twice.
  //
  // Of the accents left, `warning` is the only honest one. Green is the
  // onboarding nudge's, and it may be in this same deck. Blue is the programs
  // shelf's. Red would be the natural "phone" colour and is exactly wrong —
  // red on a call is the decline button, and this card's whole argument is that
  // picking up is easy. Amber reads as something waiting for you, which is what
  // it is. The dark `accentOn` ink and the CTA island are unchanged, so the
  // card's contrast story does not move.
  const fill = colors.accent.warning;
  const ink = colors.accentOn.warning;

  // The hero shape gets the same entrance and for the same reason: this card
  // mounts a beat AFTER Home has painted, when the offer request comes back, so
  // without it a 260pt block snaps into place and shoves the page down.
  return (
    <Animated.View entering={enter().delay(ENTER_DELAY)}>
      <PressableScale scaleTo={0.98} onPress={open} style={styles.shadow}>
        <View style={[styles.fill, { backgroundColor: fill }]}>
          <View
            style={[styles.blobA, { backgroundColor: withAlpha(ink, 0.1) }]}
            pointerEvents="none"
          />
          <View
            style={[styles.blobB, { backgroundColor: withAlpha(ink, 0.1) }]}
            pointerEvents="none"
          />

          <View>
            <Text variant="label" color={ink} style={styles.eyebrow}>
              SOMEONE WANTS TO TALK
            </Text>
            {/* The person, first. */}
            <Text variant="h2" color={ink} style={styles.title}>
              {scenario.callerName} is trying to reach you
            </Text>
            {/* And the only thing anyone needs to know about it: they can just
                pick up. No brief, no preparation, no score afterwards. */}
            <Text variant="body" color={ink}>
              {scenario.callerDesignation}. Pick up when it rings. There's
              nothing to prepare.
            </Text>
          </View>

          <View
            style={[
              styles.cta,
              {
                backgroundColor: isDark
                  ? colors.action.secondary
                  : colors.surface.inverse,
              },
            ]}
          >
            <Icon
              name={icons.phone}
              size={14}
              color={isDark ? colors.action.onSecondary : colors.text.primary}
            />
            <Text
              variant="title"
              color={isDark ? colors.action.onSecondary : colors.text.primary}
            >
              Take the call
            </Text>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
};

export default FirstCallCard;

// Geometry copied from Home's PromoCard so the two read as the same family.
const styles = StyleSheet.create({
  shadow: {
    borderRadius: radius.card,
  },
  fill: {
    height: 260,
    borderRadius: radius.card,
    overflow: "hidden",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing["3xl"],
    paddingBottom: spacing["2xl"],
    justifyContent: "space-between",
  },
  blobA: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  blobB: {
    position: "absolute",
    bottom: -20,
    right: 40,
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  eyebrow: {
    letterSpacing: 1,
    marginBottom: space.inlineGap,
  },
  title: {
    marginBottom: space.titleSub,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: space.inlineGap,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  // The watermark's box, sized to the ring at rest. Bled off the right and
  // bottom so the card's own `overflow: hidden` crops it — a mark that fits
  // neatly inside its card is an illustration, not a watermark.
  mark: {
    position: "absolute",
    right: -MARK / 3,
    bottom: -MARK / 4,
    width: MARK,
    height: MARK,
    alignItems: "center",
    justifyContent: "center",
  },
  // An OUTLINE, not a filled circle. A disc expanding from under another disc
  // is a blob; only a ring that leaves an edge behind looks like sound. The
  // ripple worklet drives `scale` and `opacity` alone, so this size is the only
  // thing that had to change when the glyph grew from a 46pt disc to a mark.
  markRing: {
    position: "absolute",
    width: MARK,
    height: MARK,
    borderRadius: MARK / 2,
    borderWidth: 1.5,
  },
});
