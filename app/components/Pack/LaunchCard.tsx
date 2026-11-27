/**
 * A LAUNCH CARD ON THE DAY FRAME'S SHEET: the practice card and the log card (program screens redesign, 2026-11-27;
 * mocks 04 and 05, system.md section 6). The whole sheet is the card: no box inside it. Pip stands above it in the tall
 * zone (dayStepFrame). The step's one main button is the dock's pill (the founder's layout "A"): the card tells the day
 * frame its button with DayLaunch, and draws here only the small links (LaunchLink).
 *
 *   slot          ONE slot of a fixed height at the top. Not started: the small label ("PRACTICE · 3 MIN", "LOG").
 *                 Done: the "Completed" tag. They share the slot, so nothing under it moves between the two states.
 *                 "· 3 min" goes when the content gives no minutes; the label is then "PRACTICE" alone.
 *   title         26/32, wraps (never cut).
 *   description   15/24, secondary. It owns the gap above it: with no description the title keeps its place and the
 *                 free space stays one block above the button.
 *   action        a small link ("Skip this practice", "Do it again"). It owns the gap above it.
 *   more          hints, saved replies, "More about this step": each owns the gap above it and draws nothing when empty.
 *
 * COLOUR (founder decision): the log's purple is only its small label. The action is the brand orange on both cards.
 * No stars, no XP, no praise in the done state.
 */
import React from "react";
import { View } from "react-native";
import PressableScale from "../PressableScale";
import { Icon, Text, fonts, makeStyles, spacing, useTheme } from "../../design-system";
import type { IconName } from "../../design-system";

export type LaunchTone = "practice" | "log";

/** "Practice · 3 min", or "Practice" when the content gives no minutes. */
export function launchLabel(tone: LaunchTone, minutes?: number | null): string {
  if (tone === "log") return "Log";
  return typeof minutes === "number" && minutes > 0 ? `Practice · ${Math.round(minutes)} min` : "Practice";
}

export function LaunchCard({ tone, minutes, completed, title, children }: {
  tone: LaunchTone;
  minutes?: number | null;
  completed?: boolean;
  title: string;
  /** The description and what follows it. Each part brings the gap above it (LaunchPart). */
  children?: React.ReactNode;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.card}>
      <View style={styles.slot}>
        {completed ? (
          <View style={styles.done}>
            <Icon name="check" size={14} color={colors.feedback.successText} />
            <Text style={styles.doneText}>Completed</Text>
          </View>
        ) : (
          <Text style={[styles.label, { color: tone === "log" ? colors.accentText.purple : colors.text.accent }]}>{launchLabel(tone, minutes)}</Text>
        )}
      </View>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {children}
    </View>
  );
}

/** One part under the title. It owns the gap above it, so a part that is not there leaves nothing behind. */
export function LaunchPart({ gap = 10, wide, children }: { gap?: number; /** The part fills the width (a button). */ wide?: boolean; children?: React.ReactNode }) {
  if (children == null || children === false) return null;
  return <View style={{ marginTop: gap, alignItems: wide ? "stretch" : "flex-start", alignSelf: "stretch" }}>{children}</View>;
}

/** A small text link: "Skip this practice" and "Do it again" in the sheet. 44 high to tap, as wide as its words. */
export function LaunchLink({ label, leftIcon, rightIcon, disabled, onPress }: { label: string; leftIcon?: IconName; rightIcon?: IconName; disabled?: boolean; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <PressableScale onPress={disabled ? undefined : onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={styles.link}>
      {leftIcon ? <Icon name={leftIcon} size={16} color={colors.text.accent} /> : null}
      <Text style={styles.linkText}>{label}</Text>
      {rightIcon ? <Icon name={rightIcon} size={16} color={colors.text.accent} /> : null}
    </PressableScale>
  );
}

const useStyles = makeStyles((c) => ({
  // 24 from the screen edge (the frame's content has the 16 gutter); the slot starts 26 under the sheet's edge
  card: { paddingHorizontal: spacing.sm, paddingTop: 2 },
  slot: { height: 30, justifyContent: "center", alignItems: "flex-start" },
  label: { fontFamily: fonts.bold, fontWeight: "700", fontSize: 12, lineHeight: 16, letterSpacing: 1, textTransform: "uppercase" },
  done: { flexDirection: "row", alignItems: "center", gap: 7, paddingLeft: 9, paddingRight: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: c.accentTint.success },
  doneText: { fontFamily: fonts.semibold, fontWeight: "600", fontSize: 13, lineHeight: 16, color: c.feedback.successText },
  title: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5, color: c.text.primary, marginTop: 10 },
  link: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6 },
  linkText: { fontFamily: fonts.semibold, fontWeight: "600", fontSize: 15, lineHeight: 20, color: c.text.accent },
}));
