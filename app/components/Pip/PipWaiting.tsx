/**
 * Pip while the person waits (P23): the sand timer where a spinner was, the goldfish or the snail on an empty list.
 * The screen keeps its own words: `label` is "Loading ..." or the list's own empty line.
 *
 *   <PipWaiting kind="loading" label="Loading programs…" />
 *   <PipWaiting kind="empty" which="goldfish" title="No one's blocked" label="People you block show up here." />
 *
 * Loading shows the sand timer alone (no Pip: founder 2026-11-28). On an empty list Pip stands on his blob; the props act under him (about 1.1 x his width), so the label waits below that room and no
 * prop covers it. He is about a third of the screen's width. The sand timer's tick stops after two loops; an empty list
 * plays three loops and then he just idles.
 * Reduced motion: PipMomentSpot shows him still, with no props.
 */
import React from "react";
import { StyleProp, View, ViewStyle, useWindowDimensions } from "react-native";
import { Text, spacing } from "../../design-system";
import { PipMomentSpot, PROP_ROOM, PropsOnly } from "./PipMomentSpot";

export interface PipWaitingProps {
  kind: "loading" | "empty";
  /** Goldfish or snail, for kind "empty". */
  which?: "goldfish" | "snail";
  /** The empty list's own headline (kind "empty"). */
  title?: string;
  /** The screen's own words: "Loading ..." or the empty list's line. */
  label?: string;
  /** An action under the words (e.g. a Chip that leads somewhere). */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const PipWaiting: React.FC<PipWaitingProps> = ({ kind, which = "goldfish", title, label, children, style }) => {
  const { width } = useWindowDimensions();
  const size = Math.round(Math.min(width * 0.34, 170));
  const loading = kind === "loading";
  return (
    <View
      accessible
      accessibilityRole={loading ? "progressbar" : undefined}
      accessibilityLabel={[title, label].filter(Boolean).join(". ") || (loading ? "Loading" : undefined)}
      style={[{ alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg }, style]}
    >
      {loading ? (
        // loading: the sand timer alone, no Pip (founder 2026-11-28)
        <PropsOnly moment="waiting-empty" variant="loading" size={size} loop loopSound={2} delay={200} />
      ) : (
        <>
          <PipMomentSpot moment="waiting-empty" variant={which} size={size} loop maxLoops={3} loopSound={3} enter delay={200} />
          <View style={{ height: Math.round(size * PROP_ROOM) }} />
        </>
      )}
      {title ? <Text variant="h3" center>{title}</Text> : null}
      {label ? <Text variant={title ? "bodySm" : "body"} color="secondary" center style={title ? { marginTop: spacing.xs } : undefined}>{label}</Text> : null}
      {children ? <View style={{ marginTop: spacing.lg, alignItems: "center" }}>{children}</View> : null}
    </View>
  );
};

export default PipWaiting;
