import React from "react";
import * as Clipboard from "expo-clipboard";
import { View } from "react-native";
import { Button, Icon, IconButton, Sheet, Text, icons, space, spacing, useTheme } from "../../design-system";
import type { StepCard, StepCardKind } from "../../api/packs/types";

/**
 * EVERY WORD OF A STEP, ONE TAP AWAY.
 *
 * A step card shows only what the reader needs before pressing its button:
 * the task line and at most two short hints. Everything else the day says
 * about the step lives here, in the original words, under four fixed
 * headings in a fixed order, so a reader learns where to look.
 *
 * Steps without a `card` (older content) pass their whole description as one
 * untitled section.
 */
const HEADINGS: Record<StepCardKind, string> = {
  do: "What you do",
  before: "Before you start",
  why: "Why",
  ifNot: "If not today",
};

export const hintIcon = (kind: "before" | "ifNot") =>
  kind === "before" ? icons.tip : icons.listen;

export const StepCardSheet: React.FC<{
  visible: boolean;
  title: string;
  sections: StepCard["sections"] | { kind?: undefined; text: string }[];
  actionLabel: string;
  onClose: () => void;
  /** Starts the step. The sheet closes first and the step starts once it is gone. */
  onAction: () => void;
}> = ({ visible, title, sections, actionLabel, onClose, onAction }) => {
  const { colors } = useTheme();
  const startAfterCloseRef = React.useRef(false);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      right={<IconButton name={icons.close} onPress={onClose} accessibilityLabel="Close" />}
      onDismissed={() => {
        if (!startAfterCloseRef.current) return;
        startAfterCloseRef.current = false;
        onAction();
      }}
      footer={
        <Button
          label={actionLabel}
          leftIcon={icons.play}
          onPress={() => {
            startAfterCloseRef.current = true;
            onClose();
          }}
        />
      }
    >
      <View style={{ gap: space.groupGap, paddingBottom: spacing.md }}>
        {sections.map((s, i) => (
          <View key={i} style={{ gap: spacing.xs }}>
            {s.kind ? (
              <Text variant="label" color={colors.text.accent}>
                {HEADINGS[s.kind]}
              </Text>
            ) : null}
            <Text variant="body" color="primary">
              {s.text}
            </Text>
          </View>
        ))}
      </View>
    </Sheet>
  );
};

/** One short hint line under the card's button. */
export const StepHint: React.FC<{ kind: "before" | "ifNot"; text: string; color: string }> = ({
  kind,
  text,
  color,
}) => (
  <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", alignSelf: "stretch" }}>
    <Icon name={hintIcon(kind)} size={16} color={color} />
    <Text variant="bodySm" color={color} style={{ flex: 1 }}>
      {text}
    </Text>
  </View>
);

/**
 * What to show on the card for a step with no `card`: the first sentence, and
 * the full text behind "More" when there is more than that. Short text shows
 * whole, with no link.
 */
export function fallbackCard(description: string): { line: string; hasMore: boolean } {
  const words = description.trim().split(/\s+/).length;
  if (words <= 30) return { line: description, hasMore: false };
  const first = description.match(/^[\s\S]+?[.?!](\s|$)/)?.[0]?.trim() ?? description;
  return { line: first, hasMore: first.length < description.trim().length };
}

/**
 * Copies a ready-made text (the buddy's five questions) so the reader can
 * paste it into any message app. The label says "Copied" for two seconds.
 */
export const CopyTextButton: React.FC<{ label: string; text: string }> = ({ label, text }) => {
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <Button
      variant="secondary"
      leftIcon={copied ? icons.success : icons.copy}
      label={copied ? "Copied" : label}
      onPress={async () => {
        try {
          await Clipboard.setStringAsync(text);
          setCopied(true);
        } catch {
          /* Clipboard unavailable: the questions are also in the task text. */
        }
      }}
    />
  );
};
