import React, { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing as REasing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import FA5Icon from "react-native-vector-icons/FontAwesome5";
import { callerGlyph } from "../../util/callerGlyph";
import {
  size,
  radius,
  Icon,
  Text,
  haptics,
  icons,
  makeStyles,
  space,
  spacing,
  useMotion,
  useTheme,
} from "../../design-system";

/**
 * ============================================================================
 * AN INCOMING CALL
 * ----------------------------------------------------------------------------
 * The rest of the app asks people to DIAL. For somebody who stutters, deciding
 * to make a call is very often the hardest part of making one — the pause with
 * a thumb over the button is where the avoidance lives. So the one call we
 * give away arrives instead. They are not choosing to put themselves through
 * something; they are picking up a phone, which everybody knows how to do.
 *
 * The screen is deliberately a phone and not an exercise: a name, who they
 * are, two buttons. No difficulty, no "practice", no instructions to read
 * first. The moment it looks like a worksheet, the nerve it is trying to
 * borrow is gone.
 *
 * DECLINE IS FREE AND SAYS SO. Nothing is spent until a call connects, and the
 * decline button is exactly as prominent as the answer button, because an
 * escape route you cannot see is not an escape route.
 * ============================================================================
 */

interface Props {
  callerName: string;
  callerDesignation: string;
  /** FontAwesome5 glyph, same vocabulary the calling widget uses. */
  icon: string;
  onAnswer: () => void;
  onDecline: () => void;
}

/** Classic double-buzz cadence, repeated — what a phone actually feels like. */
const RING_PERIOD_MS = 2200;

const RingingScreen: React.FC<Props> = ({
  callerName,
  callerDesignation,
  icon,
  onAnswer,
  onDecline,
}) => {
  const { colors } = useTheme();
  const styles = useStyles();
  const { reduced } = useMotion();

  // Two rings expanding out of the avatar on the ring cadence — the visual
  // stands in for a sound we deliberately do not play, since the only call
  // tones we ship are the ones a CALLER hears, and playing those to the person
  // being rung would be backwards.
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: REasing.out(REasing.quad) }),
        withTiming(0, { duration: 0 }),
        withTiming(0, { duration: RING_PERIOD_MS - 1400 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [reduced, pulse]);

  // The buzz. Two taps close together, then a gap — the cadence carries the
  // "incoming" meaning even for somebody looking away from the screen.
  useEffect(() => {
    const buzz = () => {
      haptics.medium();
      setTimeout(() => haptics.medium(), 180);
    };
    buzz();
    const id = setInterval(buzz, RING_PERIOD_MS);
    return () => clearInterval(id);
  }, []);

  // Two rings on the same clock, the inner one a quarter-cycle behind, so the
  // pulse reads as a wave leaving the avatar rather than a single throb.
  const outer = useAnimatedStyle(() => ({
    opacity: pulse.value === 0 ? 0 : (1 - pulse.value) * 0.35,
    transform: [{ scale: 1 + pulse.value * 0.9 }],
  }));
  const inner = useAnimatedStyle(() => {
    const p = Math.max(0, pulse.value - 0.25) / 0.75;
    return {
      opacity: pulse.value === 0 ? 0 : (1 - p) * 0.35,
      transform: [{ scale: 1 + p * 0.9 }],
    };
  });

  return (
    <View style={styles.root}>
      <View style={styles.identity}>
        <Text variant="eyebrow" color="tertiary" style={styles.eyebrow}>
          INCOMING CALL
        </Text>

        <View style={styles.avatarWrap}>
          {!reduced && (
            <>
              <Animated.View style={[styles.ring, outer]} />
              <Animated.View style={[styles.ring, inner]} />
            </>
          )}
          <View style={styles.avatar}>
            <FA5Icon
              solid
              name={callerGlyph(icon)}
              size={40}
              color={colors.accentText.purple}
            />
          </View>
        </View>

        <Text variant="screenTitle" color="primary" center>
          {callerName}
        </Text>
        <Text variant="body" color="secondary" center>
          {callerDesignation}
        </Text>
      </View>

      <View style={styles.actions}>
        <View style={styles.actionCol}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Decline the call from ${callerName}`}
            onPress={onDecline}
            style={({ pressed }) => [
              styles.callButton,
              { backgroundColor: colors.surface.control },
              pressed && styles.pressed,
            ]}
          >
            <Icon
              name={icons.close}
              size={size.tabIcon}
              color={colors.text.secondary}
            />
          </Pressable>
          <Text variant="bodySm" color="tertiary">
            Decline
          </Text>
        </View>

        <View style={styles.actionCol}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Answer the call from ${callerName}`}
            onPress={() => {
              haptics.success();
              onAnswer();
            }}
            style={({ pressed }) => [
              styles.callButton,
              { backgroundColor: colors.accent.success },
              pressed && styles.pressed,
            ]}
          >
            <Icon
              name={icons.phone}
              size={size.tabIcon}
              color={colors.accentOn.success}
            />
          </Pressable>
          <Text variant="bodySm" color="secondary">
            Answer
          </Text>
        </View>
      </View>

      {/* Said before they decide, not after they flinch. */}
      <Text variant="bodySm" color="tertiary" center style={styles.footnote}>
        Declining costs you nothing. The call stays waiting.
      </Text>
    </View>
  );
};

export default RingingScreen;

const AVATAR = 116;

const useStyles = makeStyles((c) => ({
  root: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: space.screenX,
    paddingBottom: spacing.xl,
  },
  identity: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  eyebrow: {
    marginBottom: spacing.xl,
  },
  avatarWrap: {
    height: AVATAR,
    width: AVATAR,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  ring: {
    position: "absolute",
    height: AVATAR,
    width: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: c.accent.purple,
  },
  avatar: {
    height: AVATAR,
    width: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.accentTint.purple,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  actionCol: {
    alignItems: "center",
    gap: spacing.sm,
  },
  callButton: {
    height: 68,
    width: 68,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  footnote: {
    paddingHorizontal: spacing.xl,
  },
}));
