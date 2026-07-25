import Slider from "@react-native-community/slider";
import React, { useState } from "react";
import { View } from "react-native";

import { makeStyles, Text, useTheme } from "../../design-system";
import PressableScale from "../PressableScale";

interface OnboardingOption {
  id: string;
  answer: string;
  description?: string;
}

interface Props {
  id: string;
  sequence?: number;
  question: string;
  description?: string;
  questionType: "SINGLE" | "MULTI" | "SLIDER";
  /**
   * How the choices are laid out.
   *
   * "wrap"  — pill chips that flow and wrap, sized to their label.
   * "list"  — one full-width row per option, in the order given. THE DEFAULT.
   * "scale" — an ordered five-point scale. Renders as "list" TODAY; it is a
   *           separate name because a scale carries a promise a plain list
   *           does not (evenly weighted steps, running low to high), and that
   *           promise is what any future scale-specific affordance has to keep.
   *
   * WHY THIS IS A PROP AND NOT INFERRED. Half this question bank is ordered:
   * "Effortless → Exhausting", "Very often → Almost never". An ordered scale
   * has to be read along ONE axis; flow it into wrapping columns and the
   * continuum it depends on is gone, because "3 of 5" stops being positional.
   *
   * There is no reliable way to detect that from the data — the frequency
   * scale's values are enum strings (`very_often`…`never`), identical in shape
   * to the unordered ones, so any "numeric means scale" rule silently gets it
   * wrong. Ordinality is something only the question's author knows.
   *
   * Hence "list" is the default: a question that says nothing renders exactly
   * as it always has, and server-driven questions are unaffected until someone
   * deliberately marks one.
   */
  layout?: "list" | "wrap" | "scale";
  options: OnboardingOption[];
  value?: string;
  values?: string[];
  onChange: (questionId: string, answer: string | string[]) => void;
}

const OnboardingQuestion = ({
  id,
  sequence,
  question,
  description,
  questionType,
  layout = "list",
  options,
  value,
  values = [],
  onChange,
}: Props) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const isSlider = questionType === "SLIDER";
  const isMulti = questionType === "MULTI";
  const isWrap = layout === "wrap" && !isSlider;
  /**
   * A scale renders as the ordered column, and deliberately shares the chips'
   * exact pill treatment — same shape, same border, same fill on select, same
   * press feedback. One question type should not look like it came from a
   * different app than the one before it.
   *
   * What it must NOT do is decorate per-index. An earlier attempt gave each row
   * its own tilt, its own width from a hardcoded list (86/74/82/70/88 — not
   * monotonic, so the width meant nothing), alternating left/right alignment
   * and chat-bubble tails. Randomised ornament actively destroys a scale: five
   * evenly weighted steps read as five unrelated messages, and a speech-bubble
   * tail implies a dialogue between two parties rather than one continuum.
   * Identical, evenly spaced rows in one direction ARE the scale.
   */

  // ---- SLIDER LOGIC ----
  const min = 0;
  const max = options.length > 0 ? options.length - 1 : 1;

  // 1. Determine the correct VISUAL position (Index) based on the SAVED VALUE (ID)
  // We compare Strings to ensure "123" matches 123
  const currentOptionIndex = options.findIndex(
    (opt) => String(opt.id) === String(value),
  );

  // 2. If the saved value is not found in options (or is empty), default to Index 0
  const visualIndex = currentOptionIndex !== -1 ? currentOptionIndex : 0;

  // Local state for smooth slider dragging
  const [tempValue, setTempValue] = useState(visualIndex);

  // Display Percentage
  const percentage = max > 0 ? Math.round((tempValue / max) * 100) : 0;

  // ---- MULTI + RADIO HANDLING ----
  const handlePressOption = (optionId: string) => {
    if (!isMulti) {
      return onChange(id, optionId);
    }
    const currentValues = Array.isArray(values) ? (values as string[]) : [];
    if (currentValues.includes(optionId)) {
      return onChange(
        id,
        currentValues.filter((v) => v !== String(optionId)),
      );
    }
    return onChange(id, [...currentValues, String(optionId)]);
  };

  return (
    <View style={styles.container}>
      <Text variant="display" color="primary" style={styles.question}>
        {sequence ? `${sequence}. ` : ""}
        {question}
      </Text>

      {/* SLIDER RENDERING BLOCK */}
      {isSlider ? (
        <View>
          {description && (
            <Text variant="body" color="secondary" style={styles.description}>
              {description}
            </Text>
          )}
          <View style={styles.sliderBlock}>
            <Slider
              style={styles.slider}
              value={tempValue}
              step={0.01}
              minimumValue={min}
              maximumValue={max}
              onValueChange={(v: number) => setTempValue(v)}
              onSlidingComplete={(v: number) => {
                const normalized = Math.max(0, Math.min(v, max));
                const percentage = (normalized / max) * 100;

                let score = 1;

                if (percentage >= 96) score = 10;
                else if (percentage >= 86) score = 9;
                else if (percentage >= 76) score = 8;
                else if (percentage >= 66) score = 7;
                else if (percentage >= 56) score = 6;
                else if (percentage >= 46) score = 5;
                else if (percentage >= 36) score = 4;
                else if (percentage >= 26) score = 3;
                else if (percentage >= 16) score = 2;
                else score = 1; // 1–15%

                console.log(
                  `[Slider] raw: ${v} → ${percentage.toFixed(
                    1,
                  )}% → Motivation Score: ${score}`,
                );

                onChange(id, score.toString());
              }}
              minimumTrackTintColor={colors.action.primary}
              maximumTrackTintColor={colors.surface.control}
              thumbTintColor={colors.action.primary}
            />
            <View style={styles.sliderMeta}>
              <Text variant="body" color="primary">
                {options[Math.round(tempValue)]?.answer ?? ""}
              </Text>
              <Text variant="title" color="primary">
                {percentage}%
              </Text>
            </View>
          </View>
        </View>
      ) : (
        // NON-SLIDER RENDERING BLOCK
        <View style={styles.nonSliderBlock}>
          {description && (
            <Text
              variant="body"
              color="secondary"
              style={[styles.description, { marginBottom: 4 }]}
            >
              {description}
            </Text>
          )}
          <View style={isWrap ? styles.wrapBlock : styles.listBlock}>
            {options.map((opt) => {
              const normalizedId = String(opt.id);
              const selected = isMulti
                ? values.map(String).includes(normalizedId)
                : String(value) === normalizedId;

              // CHIP. Sized to its own label, so short answers stop reserving a
              // full row each — nine options fit on one screen instead of four
              // and a half, and the set can be compared at a glance rather than
              // remembered across a scroll.
              if (isWrap) {
                return (
                  <PressableScale
                    key={opt.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => handlePressOption(opt.id)}
                    accessibilityRole={isMulti ? "checkbox" : "radio"}
                    accessibilityState={{ checked: selected }}
                  >
                    {/* NO TICK, and this took two passes to get right.

                        Drawing one only when selected changed the chip's width
                        on tap, which reflowed every chip after it — items slid
                        out from under the finger mid-multi-select, which is how
                        you mis-tap. Reserving 16pt for it on every chip fixed
                        that but cost a column of density, which was the entire
                        reason for this layout.

                        So: no mark at all. A solid fill is not "colour alone" —
                        it is a filled shape against an outlined one, a large
                        luminance change that survives greyscale — and the tick
                        was only ever restating it. Screen readers get the state
                        from accessibilityState, not from the glyph. */}
                    <Text
                      variant="body"
                      color={selected ? colors.action.onPrimary : colors.text.primary}
                    >
                      {opt.answer}
                    </Text>
                  </PressableScale>
                );
              }

              // ORDERED SCALE ROW. Same instrument as before — five discrete,
              // fully-labelled options in a fixed order, one tap, nothing
              // preselected — restyled to match the chips. Full width rather
              // than hugging: a ragged right edge on a scale implies the
              // options differ in weight, and a common left edge is what lets
              // the eye run the range in order.
              return (
                <PressableScale
                  key={opt.id}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => handlePressOption(opt.id)}
                  accessibilityRole={isMulti ? "checkbox" : "radio"}
                  accessibilityState={{ checked: selected }}
                >
                  <View style={styles.textWrap}>
                    <Text
                      variant="body"
                      color={selected ? colors.action.onPrimary : colors.text.primary}
                    >
                      {opt.answer}
                    </Text>
                    {opt.description ? (
                      <Text
                        variant="bodySm"
                        color={selected ? colors.action.onPrimary : colors.text.secondary}
                      >
                        {opt.description}
                      </Text>
                    ) : null}
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

export default OnboardingQuestion;

const useStyles = makeStyles((c, t) => ({
  container: {
    gap: t.spacing["3xl"], // Increase gap between Title and content
    paddingVertical: t.spacing.md,
  },
  question: {
    lineHeight: 42,
  },
  description: {
    lineHeight: 24,
  },
  sliderBlock: {
    marginTop: t.spacing.md,
  },
  slider: {
    width: "100%",
    height: 48,
  },
  sliderMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  nonSliderBlock: {
    gap: t.spacing.xl, // Clearer separation between description and options
  },
  /** Chips flow and wrap, each sized to its own label. */
  wrapBlock: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: t.spacing.sm,
  },
  /** Ordered options: one per row, tighter than before so a five-point scale
   *  fits on screen without scrolling — the whole scale has to be visible at
   *  once for "somewhere in the middle" to mean anything. */
  listBlock: {
    gap: t.spacing.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    // 48 is the floor, not a guess: touch targets at or above 48pt measure
    // materially fewer mis-taps, and shrinking chips to fit more per row is
    // exactly the trade that would undo the point of the layout.
    minHeight: 48,
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radius.pill,
    borderWidth: 1.5,
    borderColor: c.border.default,
    backgroundColor: c.surface.default,
  },
  /** SOLID fill, not a tint — a tinted chip beside an untinted one reads as
   *  "slightly different", where a filled one reads as chosen. `onPrimary` is
   *  the AA-correct ink for that fill. */
  chipSelected: {
    borderColor: c.action.primary,
    backgroundColor: c.action.primary,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    // 14, not 18. A five-point scale has to be visible ALL AT ONCE — you pick
    // "somewhere in the middle" by seeing the range, so a fifth option below
    // the fold breaks the instrument, not just the layout. At 14 the row is
    // 52pt tall, still clear of the 48pt touch-target floor.
    paddingVertical: 14,
    paddingHorizontal: t.spacing.xl,
    borderRadius: t.radius.pill,
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: c.border.default,
    backgroundColor: c.surface.default,
  },
  /** Solid fill, matching the chips — one selection language across the whole
   *  flow instead of a tint here and a fill there. */
  optionSelected: {
    borderColor: c.action.primary,
    backgroundColor: c.action.primary,
  },
  textWrap: { flex: 1, gap: t.spacing.xs, display: "flex", flexDirection: "column" },
}));
