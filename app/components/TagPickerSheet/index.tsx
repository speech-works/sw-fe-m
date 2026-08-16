import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  Button,
  Chip,
  IconButton,
  Sheet,
  Text,
  Toggle,
  icons,
  radius,
  space,
  spacing,
  useTheme,
} from "../../design-system";
import PressableScale from "../PressableScale";
import {
  GOAL_TAGS,
  MAX_DISCOVERY_TAGS,
  SITUATION_TAGS,
  TAG_LABELS,
} from "../../constants/discoveryTags";

export interface TagPickerSheetProps {
  visible: boolean;
  /** Tag ids currently on the card (published, or proposed and not yet sent). */
  value: string[];
  /** Whether the person is currently listed. The switch below is the ONLY way
   *  to turn that off from this screen. */
  listed: boolean;
  /** Set when the server would refuse a listing entirely (onboarding, no name).
   *  Disables the switch, exactly as the Settings screen does. */
  blockedReason?: string | null;
  saving?: boolean;
  onClose: () => void;
  /** Commits both halves at once: `setDiscoveryProfile(listed, tags)`. */
  onSave: (listed: boolean, tags: string[]) => void;
}

/**
 * Choosing what your card says, without leaving the screen it is on.
 *
 * THIS USED TO BE A WALL. Thirteen chips under the heading "What should your
 * card say?", which is a heading and not a question, in one undifferentiated
 * grid holding two completely different kinds of thing. The labels are
 * onboarding ANSWERS, and an answer with its question removed is a fragment:
 * "Pushing back" and "Open-ended chat" mean something under "which of these do
 * you find hard?" and almost nothing on their own.
 *
 * So the questions come back. Two of them, in the second person, each over the
 * group it belongs to. The question is the context those labels lost, and it
 * costs one line each.
 *
 * A small copy of the card was pinned at the top for a while, on the argument
 * that you cannot edit what you cannot see. It earned nothing: the selected
 * chips already turn orange as you tap them, so the answer to "what did that
 * do?" was on screen twice, and the second copy pushed the first question
 * below the fold.
 */
export const TagPickerSheet: React.FC<TagPickerSheetProps> = ({
  visible,
  value,
  listed,
  blockedReason,
  saving = false,
  onClose,
  onSave,
}) => {
  const { colors } = useTheme();
  const [picked, setPicked] = useState<string[]>(value);
  const [on, setOn] = useState(listed);

  // Re-seed on each opening. Closing without saving must discard, and the
  // component stays mounted between openings.
  useEffect(() => {
    if (visible) {
      setPicked(value);
      setOn(listed);
    }
  }, [visible, value, listed]);

  /**
   * The cap is a TOTAL, not a quota per question.
   *
   * Three situations and no goal is a legitimate card, and the server agrees:
   * `setDiscoveryProfile` counts the whole list and has no per-group rule. A
   * quota would force a goal onto someone who did not want to state one.
   */
  const atCap = picked.length >= MAX_DISCOVERY_TAGS;

  const toggle = (tag: string) =>
    setPicked((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_DISCOVERY_TAGS) return prev;
      return [...prev, tag];
    });

  const question = (
    title: string,
    hint: string,
    tags: readonly string[],
  ) => (
    <View style={styles.q}>
      <Text variant="title">{title}</Text>
      <Text variant="caption" color="tertiary" style={styles.qHint}>
        {hint}
      </Text>
      <View style={styles.chips}>
        {tags.map((tag) => {
          const on = picked.includes(tag);
          // AT THE CAP, THE REST GO QUIET.
          //
          // `toggle` already refused a fourth pick, but it refused it in
          // silence: the chip stayed at full strength, took the press, and did
          // nothing. That is a dead tap, and on a screen full of them the
          // reasonable conclusion is that the picker is broken rather than
          // full. Dimming says which, before the finger lands.
          const locked = atCap && !on;
          if (locked) {
            return (
              <View
                key={tag}
                style={styles.locked}
                accessible
                accessibilityRole="button"
                accessibilityState={{ disabled: true, selected: false }}
                accessibilityLabel={`${TAG_LABELS[tag] ?? tag}, remove one first`}
              >
                <Chip label={TAG_LABELS[tag] ?? tag} />
              </View>
            );
          }
          return (
            <PressableScale key={tag} onPress={() => toggle(tag)}>
              <Chip label={TAG_LABELS[tag] ?? tag} selected={on} />
            </PressableScale>
          );
        })}
      </View>
    </View>
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Your card"
      // The same close affordance every other sheet in the app carries. Without
      // it the only ways out were the backdrop and "Done", and "Done" reads as
      // a commitment — so backing out of a picker you opened by mistake meant
      // either guessing at the backdrop or saving something you did not mean to.
      right={<IconButton name={icons.close} onPress={onClose} accessibilityLabel="Close" />}
      // Pinned, not the last thing in the list. Thirteen chips over two
      // questions are taller than the sheet, so a Done button at the end of the
      // content is only found by whoever scrolls to the bottom — and the count
      // that explains the cap went down there with it. `Sheet` floats this over
      // a fade in its own colour, so the list visibly carries on behind it.
      footer={
        <View style={styles.footer}>
          <Text variant="caption" color="tertiary" style={styles.count}>
            {atCap
              ? `That's ${MAX_DISCOVERY_TAGS}. Remove one to pick another.`
              : `${picked.length} of ${MAX_DISCOVERY_TAGS} chosen`}
          </Text>
          <Button
            label={saving ? "Saving…" : "Done"}
            disabled={saving}
            onPress={() => onSave(on, picked)}
          />
        </View>
      }
    >
      <View style={styles.body}>
        {/* THE ONLY WAY TO STOP BEING FINDABLE, from this screen.
            There was none: the bar offered Change and List me, and unlisting
            lived in Settings under a name nobody would think to look for. A
            switch you can turn on and not off is not a switch.

            It commits with Done rather than on flip, matching the Settings
            screen it mirrors — one mental model for the same control in two
            places. Disabled while the server would refuse the write anyway,
            with the reason underneath, so it is never a silent no-op. */}
        <View style={[styles.listing, { backgroundColor: colors.background.sunken }]}>
          <View style={styles.listingText}>
            <Text variant="title">Let others find you</Text>
            <Text variant="bodySm" color="secondary">
              {blockedReason
                ? blockedReason
                : on
                  ? "You're in the list right now."
                  : "Nobody can find you here."}
            </Text>
          </View>
          <Toggle
            value={on}
            disabled={saving || !!blockedReason}
            onChange={() => setOn((v) => !v)}
          />
        </View>

        {question(
          "What are you practising?",
          "The ones you actually work on.",
          SITUATION_TAGS,
        )}
        {question("What are you hoping for?", "One is plenty.", GOAL_TAGS)}
      </View>
    </Sheet>
  );
};

export default TagPickerSheet;

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: space.screenX,
    paddingBottom: space.sectionGap,
    gap: space.sectionGap,
  },
  listing: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.iconText,
    padding: space.cardPad,
    borderRadius: radius.card,
  },
  listingText: { flex: 1, minWidth: 0, gap: space.titleSub },
  q: { gap: spacing.xxs },
  qHint: { marginBottom: space.inlineGap },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  // Dimmed rather than removed: the option is still real, and hiding it would
  // make the list reflow every time you hit the cap.
  locked: { opacity: 0.4 },
  // The count travels WITH the button. It is the line that explains the dimmed
  // chips, so it has to be visible at the moment the dimming happens.
  footer: { gap: space.rowGap },
  count: { textAlign: "center" },
});
