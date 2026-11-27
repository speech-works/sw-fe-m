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
  fonts,
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
import { ON_ORANGE_TRACK, sheetFill } from "./zoneSheet";

/**
 * ── THE DAY PLAYER'S OWN CHROME ─────────────────────────────────────────────
 * Approved in the program UX review (2026-11-25):
 *  - StepsBar: the day's bar in one part per step. The current part fills,
 *    and inside a lesson it fills part by part, so there is never a second bar.
 *    It sits in the day frame's orange zone (DayFrame), so it is drawn in the
 *    on-orange ink: done = the ink, to do = the ink at 20%.
 *  - StepsButton: a round list button at bottom left with a badge ("1/7").
 *    On a lesson it holds the lesson's parts ("2/4") instead. It sits in the
 *    frame's sheet (the dock): a flat disc, the badge ringed in the sheet's fill.
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
            <SegFill pct={pct} color={colors.action.onPrimary} />
          </View>
        );
      })}
    </View>
  );
}

/** One part's fill. It is as wide as the part and slides in from the left (a transform, so a lesson part that is read
 *  fills the part smoothly on Android too). Reduced motion: it jumps. */
function SegFill({ pct, color }: { pct: number; color: string }) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const [w, setW] = React.useState(0);
  const at = useSharedValue(pct), placed = React.useRef(false);
  useEffect(() => {
    if (!placed.current || reduced) { placed.current = true; at.value = pct; }
    else at.value = withTiming(pct, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [pct, reduced, at]);
  // an empty part shows nothing at all (no sliver at its left end from a half pixel)
  const st = useAnimatedStyle(() => ({ opacity: at.value > 0.001 ? 1 : 0, transform: [{ translateX: -(1 - at.value) * w }] }), [w]);
  return (
    <View style={styles.segBox} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && pct >= 0 ? <Animated.View style={[styles.segFill, { backgroundColor: color }, st]} /> : null}
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
  const { colors, scheme } = useTheme();
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
      <View style={[styles.badge, { borderColor: sheetFill(colors, scheme) }]}>
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
  const { colors, scheme } = useTheme();
  const head = `Today · ${steps.length} ${steps.length === 1 ? "step" : "steps"}${minutes ? ` · ${minutes} min` : ""}`;
  // Mock 08: the row on a bottom sheet is one step lighter than the sheet (ink: control, paper: inset).
  const rowFill = scheme === "dark" ? colors.surface.control : colors.surface.inset;
  return (
    // The sheet's top corners are 28 like every sheet of the day frame (the design-system Sheet defaults to 36).
    <Sheet visible={visible} onClose={onClose} contentStyle={{ borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
      <View style={styles.stepsBody}>
        <Text variant="h3" color="primary" style={styles.stepsTitle}>
          {head}
        </Text>
        {steps.map((s, i) => {
          const done = i < current;
          const now = i === current;
          return (
            <View key={i} style={[styles.stepRow, now && { backgroundColor: rowFill }]}>
              <View
                style={[
                  styles.stepNum,
                  { backgroundColor: rowFill },
                  now && { backgroundColor: colors.action.primary, ...primaryEdge(colors, true) },
                  done && { backgroundColor: colors.accentTint.success },
                ]}
              >
                {done ? (
                  <Icon name="check" size={16} color={colors.feedback.successText} />
                ) : (
                  <Text style={[styles.stepNumText, now && { color: colors.action.onPrimary }]}>{i + 1}</Text>
                )}
              </View>
              <View style={styles.rowText}>
                <Text variant="title" color="primary" numberOfLines={2}>
                  {s.title}
                </Text>
                {s.kind ? (
                  <Text variant="caption" color="secondary">
                    {s.kind}
                  </Text>
                ) : null}
              </View>
              {s.minutes ? (
                <Text variant="caption" color="secondary">
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
  const { colors, scheme } = useTheme();
  // Mock 02: the row on a bottom sheet is one step lighter than the sheet (ink: control, paper: inset).
  const rowFill = scheme === "dark" ? colors.surface.control : colors.surface.inset;
  return (
    // The sheet's top corners are 28 like every sheet of the day frame (the design-system Sheet defaults to 36).
    <Sheet visible={visible} onClose={onClose} contentStyle={{ borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
      <View style={styles.readBody}>
        <Text style={styles.readLabel}>TEXT SIZE</Text>
        <View style={[styles.readSizes, { backgroundColor: rowFill }]} accessibilityRole="radiogroup">
          {TEXT_SIZES.map((px, i) => {
            const on = px === textSize;
            return (
              <Pressable
                key={px}
                onPress={() => onTextSize(px)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Text size ${px}`}
                style={[styles.readSize, on && { backgroundColor: colors.action.primary, ...primaryEdge(colors, true) }]}
              >
                <Text style={[styles.readSizeA, { fontSize: READ_A[i] ?? px, color: on ? colors.action.onPrimary : colors.text.secondary }]}>A</Text>
              </Pressable>
            );
          })}
        </View>
        {/* "In this lesson" is one part with its label and the gap above it: a lesson with one part has neither, and
            the sheet is shorter. */}
        {parts.length > 1 ? (
          <View style={styles.readParts}>
            <Text style={styles.readLabel}>IN THIS LESSON</Text>
            <View style={styles.readRows}>
              {parts.map((p, i) => {
                const on = i === current;
                const done = i < current;
                return (
                  <Pressable
                    key={i}
                    onPress={() => onPick(i)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.stepRow, on && { backgroundColor: rowFill }]}
                  >
                    <View
                      style={[
                        styles.stepNum,
                        { backgroundColor: rowFill },
                        on && { backgroundColor: colors.action.primary, ...primaryEdge(colors, true) },
                        done && { backgroundColor: colors.accentTint.success },
                      ]}
                    >
                      {done ? (
                        <Icon name={icons.success} size={14} color={colors.feedback.successText} />
                      ) : (
                        <Text style={[styles.stepNumText, on && { color: colors.action.onPrimary }]}>{i + 1}</Text>
                      )}
                    </View>
                    <Text variant="title" color="primary" style={styles.rowText} numberOfLines={2}>
                      {p.title || `Part ${i + 1}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}

/** The three "A"s of the text-size control (the sizes they stand for are TEXT_SIZES). */
const READ_A = [15, 18, 21] as const;

const useStyles = makeStyles((c) => ({
  bar: { flexDirection: "row", gap: 4 },
  seg: {
    flex: 1,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: ON_ORANGE_TRACK,
    overflow: "hidden",
  },
  segBox: { flex: 1 },
  segFill: { width: "100%", height: "100%", borderRadius: radius.full },
  fab: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: c.surface.elevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.border.default,
  },
  // ringed in the sheet's fill (set where it is drawn), so it reads as sitting on the disc's rim
  badge: {
    position: "absolute",
    top: -7,
    right: -8,
    minWidth: 30,
    paddingHorizontal: 6,
    height: 21,
    borderRadius: radius.full,
    borderWidth: 2,
    backgroundColor: c.action.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 10.5, lineHeight: 14, fontWeight: "700", color: c.action.onPrimary },
  sheetBody: { paddingBottom: spacing.lg },
  // steps sheet (mock 08): no lines; rows are 56 high with 12 inside, the title lines up with the row text
  stepsBody: { paddingBottom: spacing.lg },
  stepsTitle: { marginBottom: spacing.sm, marginLeft: spacing.sm },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18 },
  stepNum: { width: 28, height: 28, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontSize: 12, lineHeight: 14, fontWeight: "700", color: c.text.tertiary },
  // reading sheet (mock 02): labels and the size control 24 from the screen edge, part rows like the steps sheet's
  readBody: { paddingTop: 2, paddingBottom: spacing.sm },
  readLabel: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1, color: c.text.tertiary, marginHorizontal: spacing.sm },
  readSizes: { flexDirection: "row", height: 52, padding: 4, borderRadius: 26, marginTop: 12, marginHorizontal: spacing.sm },
  readSize: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  readSizeA: { fontFamily: fonts.semibold, fontWeight: "600", lineHeight: 26 },
  readParts: { marginTop: 28 },
  readRows: { marginTop: 10 },
  sheetTitle: { marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  rowLine: { borderTopWidth: 1, borderTopColor: c.border.hairline },
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
