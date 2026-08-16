import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  Button,
  Chip,
  IconButton,
  Sheet,
  Text,
  Toggle,
  borderWidth,
  icons,
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

  /**
   * WHAT THE BUTTON WILL ACTUALLY DO.
   *
   * It said "Done", and "Done" was the honest word for it while the label was
   * fixed: this one press commits BOTH halves, so its outcome genuinely
   * differs. Turning the switch on puts you in front of strangers; turning it
   * off takes you out; leaving it alone just saves your tags. One word cannot
   * be true for all three, so the word follows the switch.
   *
   * That also gives the switch the confirmation it was missing. It commits on
   * Done rather than on flip, which is right and matches Settings, but it left
   * nothing on screen saying what the flip would do. Now the button changes
   * under your thumb the moment you touch it.
   *
   * The nouns are the sheet's own: it already says "You're in the list right
   * now" and the row that opens it says "Listed". Nothing new to learn.
   */
  const commitLabel =
    on && !listed
      ? "Put me in the list"
      : !on && listed
        // Short and undramatic on purpose. Leaving is not a punishment and
        // does not get warning language.
        ? "Take me out"
        : "Save my card";

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
      // it the only ways out were the backdrop and the commit button, and that
      // button now names a consequence out loud, so backing out of a picker you
      // opened by mistake would mean either guessing at the backdrop or doing
      // the very thing you came to avoid.
      right={<IconButton name={icons.close} onPress={onClose} accessibilityLabel="Close" />}
      // Pinned, not the last thing in the list. Thirteen chips over two
      // questions are taller than the sheet, so a commit button at the end of
      // the content is only found by whoever scrolls to the bottom — and the count
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
            label={saving ? "Saving…" : commitLabel}
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

            It commits with the button rather than on flip, matching the
            Settings screen it mirrors — one mental model for the same control in two
            places. Disabled while the server would refuse the write anyway,
            with the reason underneath, so it is never a silent no-op. */}
        <View style={[styles.listing, { borderBottomColor: colors.border.default }]}>
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
  // NO horizontal padding. `Sheet` already puts `space.screenX` on its content,
  // and adding another gutter here put the body at 32 while the pinned footer
  // sat on the sheet's real gutter of 16 — so the button was visibly out of line with
  // every chip above it.
  body: {
    paddingBottom: space.sectionGap,
    gap: space.sectionGap,
  },
  // NO PLATE. It was a sunken card with 16pt of its own padding, which stacked
  // on the sheet's 16pt gutter and started the label 31pt in while every heading
  // below it started at 16 — two left edges in one sheet, measured.
  //
  // A filled plate could have been bled to the sheet edges to fix that, but on
  // paper it barely separated from the surface anyway (#F0E9DE on #FFFFFF), so
  // it was carrying almost nothing in one of the two schemes. Removing it aligns
  // the row by construction: with no padding to cancel, the label simply sits on
  // the gutter. A hairline closes the row off from the questions underneath.
  listing: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.iconText,
    paddingBottom: space.rowGap,
    borderBottomWidth: borderWidth.hairline,
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
