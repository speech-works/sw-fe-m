import React, { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Circle, Stop } from "react-native-svg";
import {
  Icon,
  Sheet,
  Text,
  haptics,
  icons,
  makeStyles,
  primaryEdge,
  radius,
  rangeValue,
  spacing,
  useTheme,
} from "../../design-system";
import { DayStep } from "../../util/packs/stepList";
import { TeachPart } from "../../util/packs/teachParts";

/**
 * ── THE DAY PLAYER'S OWN CHROME ─────────────────────────────────────────────
 * Approved in the program UX review (2026-11-25):
 *  - StepsBar: the day's bar in one part per step. The current part fills,
 *    and inside a lesson it fills part by part, so there is never a second bar.
 *  - StepsButton: a round list button at bottom left with a badge ("1/7").
 *    On a lesson it holds the lesson's parts ("2/4") instead.
 *  - DayStepsSheet / ReadingSheet: what that button opens.
 */

export function StepsBar({ count, current, fill }: { count: number; current: number; fill: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const n = Math.max(1, count);
  return (
    <View
      style={styles.bar}
      accessibilityRole="progressbar"
      // Whole numbers only on Android (see design-system/utils/a11y).
      accessibilityValue={rangeValue(((current + fill) / n) * 100)}
    >
      {Array.from({ length: n }, (_, i) => {
        const pct = i < current ? 1 : i === current ? Math.max(0, Math.min(1, fill)) : 0;
        return (
          <View key={i} style={styles.seg}>
            <View style={[styles.segFill, { width: `${pct * 100}%`, backgroundColor: colors.text.accent }]} />
          </View>
        );
      })}
    </View>
  );
}

export function StepsButton({
  badge,
  onPress,
  accessibilityLabel,
}: {
  badge: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.96 }] }]}
    >
      <Icon name="list" size={22} color={colors.text.primary} />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    </Pressable>
  );
}

export function DayStepsSheet({
  visible,
  onClose,
  steps,
  current,
  minutes,
}: {
  visible: boolean;
  onClose: () => void;
  steps: DayStep[];
  current: number;
  minutes?: number | null;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const head = `Today · ${steps.length} ${steps.length === 1 ? "step" : "steps"}${minutes ? ` · ${minutes} min` : ""}`;
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.sheetBody}>
        <Text variant="h3" color="primary" style={styles.sheetTitle}>
          {head}
        </Text>
        {steps.map((s, i) => {
          const done = i < current;
          const now = i === current;
          return (
            <View key={i} style={[styles.row, i > 0 && styles.rowLine]}>
              <View
                style={[
                  styles.num,
                  now && { backgroundColor: colors.action.primary, ...primaryEdge(colors, true) },
                  done && { backgroundColor: colors.accentTint.success },
                ]}
              >
                {done ? (
                  <Icon name={icons.success} size={14} color={colors.feedback.successText} />
                ) : (
                  <Text style={[styles.numText, now && { color: colors.action.onPrimary }]}>{i + 1}</Text>
                )}
              </View>
              <View style={styles.rowText}>
                <Text variant="title" color="primary" numberOfLines={2}>
                  {s.title}
                </Text>
                {s.kind ? (
                  <Text variant="caption" color="tertiary">
                    {s.kind}
                  </Text>
                ) : null}
              </View>
              {s.minutes ? (
                <Text variant="caption" color="tertiary">
                  {s.minutes} min
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </Sheet>
  );
}

/**
 * Day done: the day number glows in the sunrise orange and breathes slowly,
 * in place of the trophy (program UX review, 2026-11-25). Still with reduced
 * motion.
 */
export function DayGlow({ day }: { day: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    pulse.value = withRepeat(withTiming(1.04, { duration: 1600, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [reduced, pulse]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <Animated.View style={[styles.glow, anim]} accessibilityLabel={`Day ${day}`}>
      <Svg width={128} height={128} style={styles.glowSvg}>
        <Defs>
          <RadialGradient id="dayglow" cx="50%" cy="46%" r="50%">
            <Stop offset="0" stopColor="#FFB580" stopOpacity="1" />
            <Stop offset="0.48" stopColor="#FF9040" stopOpacity="1" />
            <Stop offset="0.74" stopColor="#FF6B00" stopOpacity="0.22" />
            <Stop offset="1" stopColor="#FF6B00" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="64" cy="64" r="64" fill="url(#dayglow)" />
      </Svg>
      <Text variant="h1" style={{ color: colors.action.onPrimary }}>
        {day}
      </Text>
    </Animated.View>
  );
}

/** Day done: tomorrow's day by its own title, under the "opens in" line. */
export function TomorrowCard({ title }: { title: string }) {
  const styles = useStyles();
  return (
    <View style={styles.tomorrow}>
      <Text variant="label" style={styles.tomorrowLabel}>
        TOMORROW
      </Text>
      <Text variant="title" color="primary">
        {title}
      </Text>
    </View>
  );
}

export const TEXT_SIZES = [16, 18, 20] as const;

export function ReadingSheet({
  visible,
  onClose,
  parts,
  current,
  textSize,
  onTextSize,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  parts: TeachPart[];
  current: number;
  textSize: number;
  onTextSize: (px: number) => void;
  onPick: (index: number) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.sheetBody}>
        <Text variant="label" color="tertiary" style={styles.sheetLabel}>
          TEXT SIZE
        </Text>
        <View style={styles.sizes} accessibilityRole="radiogroup">
          {TEXT_SIZES.map((px) => {
            const on = px === textSize;
            return (
              <Pressable
                key={px}
                onPress={() => onTextSize(px)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Text size ${px}`}
                style={[styles.sizeBtn, on && styles.sizeOn]}
              >
                <Text style={{ fontSize: px, lineHeight: px + 6, color: on ? colors.text.primary : colors.text.secondary }}>A</Text>
              </Pressable>
            );
          })}
        </View>
        <Text variant="label" color="tertiary" style={styles.sheetLabel}>
          IN THIS LESSON
        </Text>
        {parts.map((p, i) => {
          const on = i === current;
          return (
            <Pressable
              key={i}
              onPress={() => onPick(i)}
              accessibilityRole="button"
              style={[styles.row, styles.partRow, on && { backgroundColor: colors.action.primaryTint }]}
            >
              <View style={[styles.num, i < current && { backgroundColor: colors.accentTint.success }]}>
                {i < current ? (
                  <Icon name={icons.success} size={14} color={colors.feedback.successText} />
                ) : (
                  <Text style={styles.numText}>{i + 1}</Text>
                )}
              </View>
              <Text variant="title" color={on ? "accent" : "primary"} style={styles.rowText} numberOfLines={2}>
                {p.title || `Part ${i + 1}`}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles((c, t) => ({
  bar: { flexDirection: "row", gap: 3 },
  seg: {
    flex: 1,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: c.surface.control,
    overflow: "hidden",
  },
  segFill: { height: "100%", borderRadius: radius.full },
  fab: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: c.surface.elevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.border.default,
    ...t.elevation.e2,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 26,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: c.action.primary,
    ...primaryEdge(c, true),
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 11, lineHeight: 14, fontWeight: "700", color: c.action.onPrimary },
  sheetBody: { paddingBottom: spacing.lg },
  sheetTitle: { marginBottom: spacing.sm },
  sheetLabel: { marginTop: spacing.md, marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  rowLine: { borderTopWidth: 1, borderTopColor: c.border.hairline },
  partRow: { paddingHorizontal: spacing.sm, borderRadius: radius.input },
  rowText: { flex: 1 },
  num: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: c.surface.control,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: { fontSize: 12, fontWeight: "600", color: c.text.secondary },
  sizes: {
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.input,
    backgroundColor: c.background.sunken,
  },
  sizeBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.sm, borderRadius: radius.md },
  sizeOn: { backgroundColor: c.surface.elevated },
  glow: { width: 128, height: 128, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  glowSvg: { position: "absolute", left: 0, top: 0 },
  tomorrow: {
    alignSelf: "stretch",
    marginTop: 16,
    marginBottom: 4,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: c.accentTint.purple,
    borderWidth: 1,
    borderColor: c.border.hairline,
    gap: 4,
  },
  tomorrowLabel: { color: c.accentText.purple },
}));
