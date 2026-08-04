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
  press,
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
 * TWO SHAPES, NEVER ZERO. Somebody who said "not now" gets a single quiet row
 * instead of the hero card; the call is still one tap away in both, because
 * the offer is theirs and nothing on the device may take it back. The card
 * renders nothing at all only when the SERVER says there is nothing to offer.
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
  max: 1.5, // ~11.5pt past the 46pt disc, inside the 12pt gap to the title
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

/** Entrance delay — the row lands AFTER its Home neighbours have settled, so the
 *  last thing to move on the screen is the thing we want looked at. */
const ENTER_DELAY = 190;

const FirstCallCard: React.FC = () => {
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

  if (quiet) {
    return (
      <Animated.View entering={enter().delay(ENTER_DELAY)}>
        <PressableScale scaleTo={press.scale} onPress={open}>
          <View
            style={[
              styles.row,
              {
                backgroundColor: colors.surface.default,
                borderColor: colors.border.hairline,
              },
            ]}
          >
            {/* A SOLID DISC. The original objection stands and is unchanged: a
                12%-alpha wash behind a small icon is the weakest object the
                system can make, and this row is somebody asking to speak to
                you. Quiet is the right prominence for a person who said "not
                now"; characterless is not the same as quiet.
                The glyph inside it is a PHONE rather than her initial, because
                rings leaving a letter mean nothing — leaving a handset they are
                immediately, wordlessly a call. Her name is in the title anyway. */}
            <View style={styles.glyphWrap}>
              {/* Drawn BEFORE the disc, so each ring is only ever the part that
                  has already travelled beyond it. Absent entirely under reduced
                  motion, as in `PulseDot`. */}
              {!reduced
                ? ripples.map((style, i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.ring,
                        { borderColor: colors.accent.purple },
                        style,
                      ]}
                      pointerEvents="none"
                    />
                  ))
                : null}
              <View
                style={[
                  styles.rowGlyph,
                  { backgroundColor: colors.accent.purple },
                ]}
              >
                {/* Only the handset swings; the disc it sits in stays put. A
                    disc that shakes too is a wobbling button, not a ringing
                    phone — the thing that rings has to be the thing that moves. */}
                <Animated.View style={shakeStyle}>
                  <Icon
                    name={icons.phone}
                    size={20}
                    color={colors.accentOn.purple}
                  />
                </Animated.View>
              </View>
            </View>
            <View style={styles.rowText}>
              <Text variant="title" color="primary">
                {scenario.callerName} still wants to call
              </Text>
              <Text variant="bodySm" color="secondary">
                Whenever you're ready. It's waiting for you
              </Text>
            </View>
            {/* A filled action, not a hairline chevron — the thin glyph is what
                made this read as a settings row rather than a card. */}
            <View
              style={[
                styles.rowAction,
                { backgroundColor: colors.text.primary },
              ]}
            >
              <Icon
                name={icons.forward}
                size={16}
                color={colors.surface.default}
              />
            </View>
          </View>
        </PressableScale>
      </Animated.View>
    );
  }

  const fill = colors.accent.purple;
  const ink = colors.accentOn.purple;

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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  // Sized to the disc exactly, and NOT clipped — the rings have to travel past
  // these bounds. `styles.row` carries no overflow rule for the same reason.
  glyphWrap: {
    height: 46,
    width: 46,
  },
  // An OUTLINE, not a filled circle. A disc expanding from under another disc
  // is a blob; only a ring that leaves an edge behind looks like sound. Hairline
  // thin, because one ripple at a time carries the signal on its own.
  ring: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 46,
    width: 46,
    borderRadius: 23,
    borderWidth: 1.25,
  },
  rowGlyph: {
    height: 46,
    width: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  rowAction: {
    height: 32,
    width: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: spacing.xxs,
  },
});
