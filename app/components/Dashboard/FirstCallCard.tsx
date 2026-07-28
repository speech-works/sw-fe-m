import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { FirstCallOffer, fetchFirstCallOffer } from "../../api/firstCall";
import {
  Icon,
  Text,
  icons,
  radius,
  space,
  spacing,
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

const FirstCallCard: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors, scheme } = useTheme();
  const isDark = scheme === "dark";
  const [offer, setOffer] = useState<FirstCallOffer | null>(null);

  const takenAt = useUserStore((s) => s.user?.firstCallTakenAt);

  const acceptedPreSignup = useFirstCallStore((s) => s.acceptedPreSignup);
  const clearPreSignup = useFirstCallStore((s) => s.clearPreSignup);
  const deferredAt = useFirstCallStore((s) => s.deferredAt);
  const noHeadphones = useFirstCallStore((s) => s.noHeadphones);
  const quiet = isFirstCallQuieted({ deferredAt, noHeadphones });

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
  // `alreadyTaken` is re-checked at RENDER, not just before the fetch. Home
  // does not remount this on navigation, so somebody returning straight from
  // their first call would otherwise still see "Maya is trying to reach you"
  // for a call they had just taken — the offer state is from mount, but the
  // user store updated the moment the call completed.
  if (!scenario || alreadyTaken) return null;

  const open = () => navigation.navigate("FirstCall", { offer });

  if (quiet) {
    return (
      <PressableScale scaleTo={0.99} onPress={open}>
        <View
          style={[
            styles.row,
            {
              backgroundColor: colors.surface.default,
              borderColor: colors.border.hairline,
            },
          ]}
        >
          <View
            style={[
              styles.rowGlyph,
              { backgroundColor: colors.accentTint.purple },
            ]}
          >
            <Icon
              name={icons.phone}
              size={18}
              color={colors.accentText.purple}
            />
          </View>
          <View style={styles.rowText}>
            <Text variant="title" color="primary">
              {scenario.callerName} still wants to call
            </Text>
            <Text variant="bodySm" color="secondary">
              Whenever you're ready — it's waiting for you
            </Text>
          </View>
          <Icon
            name={icons.chevronRight}
            size={16}
            color={colors.text.tertiary}
          />
        </View>
      </PressableScale>
    );
  }

  const fill = colors.accent.purple;
  const ink = colors.accentOn.purple;

  return (
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
            {scenario.callerDesignation}. Pick up when it rings — there's
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
  rowGlyph: {
    height: 38,
    width: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: spacing.xxs,
  },
});
