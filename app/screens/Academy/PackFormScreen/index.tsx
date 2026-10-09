import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { submitFormResponse } from "../../../api";
import { getFormRecall } from "../../../api/packs";
import {
  FormConfiguration,
  FormField,
  FormFieldType,
  FormRecallItem,
} from "../../../api/packs/types";
import PressableScale from "../../../components/PressableScale";
import {
  Button,
  Page,
  Surface,
  Text,
  borderWidth,
  fonts,
  radius,
  spacing,
  useTheme,
} from "../../../design-system";
import {
  showErrorBottomSheet,
  showSuccessBottomSheet,
} from "../../../util/functions/bottomSheet";
import { formScreenHeader } from "../../../util/packs/formBlock";
import { textFieldProblem, wordCount } from "../../../util/packs/textLimits";

/** Keys of `colors.accent` / `accentOn` — the flow's fill + its AA-correct ink. */
type AccentKey = "lime" | "purple" | "success" | "warning" | "danger" | "info";

type PackFormRouteProp = RouteProp<
  {
    params: {
      configuration: FormConfiguration;
      formId: string;
      packId: string;
      moduleId: string;
      blockId: string;
      /** The step's name from the day, the one on the card that opened this. */
      titleOverride?: string;
      /** The step shows the user's earlier answers above the fields. */
      hasRecall?: boolean;
      /** Flow accent, inherited from the card that opened this form. Reflection = purple. */
      accentKey?: AccentKey;
    };
  },
  "params"
>;

// ─────────────────────────────────────────────────────────
// Field Renderers
// ─────────────────────────────────────────────────────────

interface FieldProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  /** Flow accent fill + its AA-correct on-fill ink. */
  accent: string;
  onAccent: string;
}

/** LIKERT_5 / LIKERT_7 — discrete numbered tap targets */
const LikertField: React.FC<FieldProps & { count: number }> = ({
  field,
  value,
  onChange,
  count,
  accent,
  onAccent,
}) => {
  const { colors } = useTheme();
  const targets = Array.from({ length: count }, (_, i) => i + 1);
  return (
    <View style={fieldStyles.likertContainer}>
      <View style={fieldStyles.likertRow}>
        {targets.map((n) => {
          const isSelected = value === n;
          return (
            <PressableScale
              key={n}
              style={[
                fieldStyles.likertTarget,
                {
                  backgroundColor: isSelected ? accent : colors.surface.control,
                  borderColor: isSelected ? "transparent" : colors.border.strong,
                },
              ]}
              onPress={() => onChange(n)}
            >
              <Text
                variant="title"
                color={isSelected ? onAccent : "secondary"}
              >
                {n}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      {(field.minLabel || field.maxLabel) && (
        <View style={fieldStyles.likertLabels}>
          <Text variant="caption" color="tertiary">
            {field.minLabel || ""}
          </Text>
          <Text variant="caption" color="tertiary">
            {field.maxLabel || ""}
          </Text>
        </View>
      )}
    </View>
  );
};

/** SLIDER — continuous range */
const SliderField: React.FC<FieldProps> = ({
  field,
  value,
  onChange,
  accent,
}) => {
  const { colors } = useTheme();
  const min = field.min ?? 0;
  const max = field.max ?? 100;
  // THE THUMB STARTS IN THE MIDDLE; THE ANSWER DOES NOT.
  //
  // This used to print the midpoint as though it were the answer while the
  // form held nothing, so a required slider showed "5" beside a dead Complete
  // button, and nobody could answer 5 without dragging away and back. The
  // midpoint is not pre-filled either: a silent 5 for everyone who never moved
  // it would poison the day-one vs last-day comparison. Until they touch it,
  // the number reads "Drag to set", and a touch that lands where the thumb
  // already sits (onSlidingComplete) or a tap on the track (tapToSeek) counts.
  const answered = value !== undefined && value !== null;
  const current = answered ? value : Math.round((min + max) / 2);

  return (
    <View style={fieldStyles.sliderContainer}>
      <Slider
        style={{ width: "100%", height: 40 }}
        minimumValue={min}
        maximumValue={max}
        step={1}
        value={current}
        onValueChange={onChange}
        onSlidingComplete={onChange}
        tapToSeek
        minimumTrackTintColor={accent}
        maximumTrackTintColor={colors.surface.track}
        thumbTintColor={accent}
      />
      <View style={fieldStyles.likertLabels}>
        <Text variant="caption" color="tertiary">
          {field.minLabel || String(min)}
        </Text>
        <Text
          variant={answered ? "title" : "caption"}
          color={answered ? "primary" : "tertiary"}
        >
          {answered ? current : "Drag to set"}
        </Text>
        <Text variant="caption" color="tertiary">
          {field.maxLabel || String(max)}
        </Text>
      </View>
    </View>
  );
};

/** BOOLEAN_TOGGLE — Yes / No segment */
const BooleanToggleField: React.FC<FieldProps> = ({
  value,
  onChange,
  accent,
  onAccent,
}) => {
  const { colors } = useTheme();
  return (
    <View style={fieldStyles.toggleRow}>
      {[
        { label: "Yes", val: true },
        { label: "No", val: false },
      ].map(({ label, val }) => {
        const isSelected = value === val;
        return (
          <PressableScale
            key={label}
            style={[
              fieldStyles.toggleOption,
              {
                backgroundColor: isSelected ? accent : colors.surface.control,
                borderColor: isSelected ? "transparent" : colors.border.strong,
              },
            ]}
            onPress={() => onChange(val)}
          >
            <Text
              variant="title"
              color={isSelected ? onAccent : "secondary"}
            >
              {label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
};

/** TEXT_INPUT — a text area, or one line. Shows its limit and stops typing at it. */
const TextInputField: React.FC<FieldProps> = ({ field, value, onChange }) => {
  const { colors } = useTheme();
  const text: string = value || "";
  const words = wordCount(text);

  const handleChange = (next: string) => {
    // Hard stop: a paste or a keystroke that would pass the word limit is not taken.
    if (field.maxWords !== undefined && wordCount(next) > field.maxWords) return;
    onChange(next);
  };

  const counter = (() => {
    if (field.minWords !== undefined || field.maxWords !== undefined) {
      const lo = field.minWords ?? 0;
      const hi = field.maxWords;
      return `${words} words${hi !== undefined ? ` · ${lo > 0 ? `${lo} to ${hi}` : `up to ${hi}`}` : ""}`;
    }
    if (field.maxLength !== undefined) return `${text.length} / ${field.maxLength}`;
    return null;
  })();
  const tooShort =
    field.minWords !== undefined && words > 0 && words < field.minWords;

  return (
    <View>
      <TextInput
        style={[
          fieldStyles.textInput,
          field.singleLine ? fieldStyles.textInputSingle : null,
          {
            backgroundColor: colors.input.bg,
            borderColor: colors.input.border,
            color: colors.text.primary,
          },
        ]}
        value={text}
        onChangeText={handleChange}
        placeholder={field.placeholder || "Type your response..."}
        placeholderTextColor={colors.input.placeholder}
        maxLength={field.maxLength}
        {...(field.singleLine
          ? { multiline: false }
          : { multiline: true, numberOfLines: 4, textAlignVertical: "top" as const })}
      />
      {counter ? (
        <Text
          variant="caption"
          color={tooShort ? colors.accent.danger : "tertiary"}
          style={fieldStyles.counter}
        >
          {counter}
        </Text>
      ) : null}
    </View>
  );
};

/** MULTIPLE_CHOICE — radio buttons */
const MultipleChoiceField: React.FC<FieldProps> = ({
  field,
  value,
  onChange,
  accent,
}) => {
  const { colors } = useTheme();
  return (
    <View style={fieldStyles.mcContainer}>
      {(field.options || []).map((option, idx) => {
        const isSelected = value === option;
        return (
          <PressableScale
            key={idx}
            style={[
              fieldStyles.mcOption,
              {
                backgroundColor: colors.surface.control,
                borderColor: isSelected ? accent : colors.border.default,
              },
            ]}
            onPress={() => onChange(option)}
          >
            <View
              style={[
                fieldStyles.mcRadio,
                {
                  borderColor: isSelected ? accent : colors.border.strong,
                },
              ]}
            >
              {isSelected && (
                <View
                  style={[
                    fieldStyles.mcRadioDot,
                    { backgroundColor: accent },
                  ]}
                />
              )}
            </View>
            <Text
              variant="body"
              color={isSelected ? "primary" : "secondary"}
              style={fieldStyles.mcOptionText}
            >
              {option}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
};

// ─────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────

const PackFormScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<PackFormRouteProp>();
  const { colors } = useTheme();
  const { configuration, formId, packId, moduleId, blockId } = route.params;

  // Flow accent, inherited from the card that opened this form (reflection = purple).
  const accentKey: AccentKey = route.params.accentKey ?? "purple";
  const accent = colors.accent[accentKey];
  const onAccent = colors.accentOn[accentKey];

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const header = formScreenHeader(configuration, route.params.titleOverride);

  // EARLIER ANSWERS, FETCHED HERE. This screen mounts fresh every time the
  // card is tapped, so the answers are read when the form opens rather than
  // taken from the day payload, which was loaded before the user went off to
  // the activity and is not reloaded on the way back. Any failure leaves the
  // panel empty and the form as it always was.
  const hasRecall = !!route.params.hasRecall;
  const [recall, setRecall] = useState<FormRecallItem[]>([]);
  useEffect(() => {
    if (!hasRecall || !packId || !moduleId || !blockId) return;
    let live = true;
    getFormRecall(packId, moduleId, blockId).then((r) => {
      if (live) setRecall(r.items);
    });
    return () => {
      live = false;
    };
  }, [hasRecall, packId, moduleId, blockId]);

  const updateAnswer = (fieldId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  // Check if all required fields have answers
  const allRequiredFilled = useMemo(() => {
    return (configuration?.fields || [])
      .filter((f) => f.required)
      .every((f) => {
        const val = answers[f.id];
        return val !== undefined && val !== null && val !== "";
      });
  }, [answers, configuration?.fields]);

  const handleSubmit = async () => {
    if (!allRequiredFilled) {
      showErrorBottomSheet(
        "Incomplete",
        "Please answer all required fields before submitting.",
      );
      return;
    }

    const problem = (configuration?.fields || [])
      .map((f) => textFieldProblem(f, answers[f.id]))
      .find((p) => p !== null);
    if (problem) {
      showErrorBottomSheet("Check your answer", problem);
      return;
    }

    try {
      setSubmitting(true);
      await submitFormResponse(formId, answers, { packId, moduleId });

      // Persist completion locally
      const storageKey = `pack-${packId}-module-${moduleId}-form-${blockId}`;
      await AsyncStorage.setItem(storageKey, "true");

      // ONE OUTCOME, ALWAYS. A "breakthrough" modal used to pre-empt this —
      // see the note in `api/forms/types.ts` for why it is gone.
      showSuccessBottomSheet(
        "Reflection Saved",
        "Your response has been recorded.",
      );
      navigation.goBack();
    } catch (error: any) {
      console.error("Form submission failed:", error);
      // The server explains a refused answer in plain words (a limit on length or words).
      const reason: unknown = error?.response?.data?.error;
      showErrorBottomSheet(
        "Submission Failed",
        typeof reason === "string" && reason
          ? reason
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = answers[field.id];
    const onChange = (v: any) => updateAnswer(field.id, v);

    const fieldProps = { field, value, onChange, accent, onAccent };

    switch (field.type) {
      case FormFieldType.LIKERT_5:
        return <LikertField {...fieldProps} count={field.ratingMax ?? 5} />;
      case FormFieldType.LIKERT_7:
        return <LikertField {...fieldProps} count={field.ratingMax ?? 7} />;
      case FormFieldType.SLIDER:
        return <SliderField {...fieldProps} />;
      case FormFieldType.BOOLEAN_TOGGLE:
        return <BooleanToggleField {...fieldProps} />;
      case FormFieldType.TEXT_INPUT:
        return <TextInputField {...fieldProps} />;
      case FormFieldType.MULTIPLE_CHOICE:
        return <MultipleChoiceField {...fieldProps} />;
      default:
        return (
          <Text variant="bodySm" color="tertiary">
            Unsupported field type
          </Text>
        );
    }
  };

  return (
    <>
      <Page
        title={header.title}
        description={header.description || undefined}
        onBack={() => navigation.goBack()}
        keyboardAvoiding
        footer={
          <Button
            label="Complete"
            leftIcon="check"
            accentColor={accent}
            onAccentColor={onAccent}
            loading={submitting}
            disabled={!allRequiredFilled}
            onPress={handleSubmit}
          />
        }
      >
        {recall.length > 0 ? (
          <Surface level="default" rounded="card" padded={spacing.xl}>
            <View
              style={styles.recall}
              accessible
              accessibilityLabel={`Saved earlier. ${recall
                .map((r) => `${r.label}: ${r.value}`)
                .join(". ")}`}
            >
              <Text variant="eyebrow" color="tertiary">
                SAVED EARLIER
              </Text>
              {recall.map((item, i) => (
                <View key={`${item.label}-${i}`} style={styles.recallItem}>
                  <Text variant="bodySm" color="secondary">
                    {item.label}
                  </Text>
                  <Text variant="body" color="primary">
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          </Surface>
        ) : null}

        {(configuration?.fields || []).map((field) => (
          <Surface
            key={field.id}
            level="default"
            rounded="card"
            padded={spacing.xl}
          >
            <View style={styles.fieldHeader}>
              <Text variant="title" color="primary" style={styles.fieldLabel}>
                {field.label}
              </Text>
              {field.required && (
                <View
                  style={[styles.requiredBadge, { backgroundColor: accent }]}
                >
                  <Text variant="caption" color={onAccent}>
                    Required
                  </Text>
                </View>
              )}
            </View>
            {field.description ? (
              <Text
                variant="bodySm"
                color="secondary"
                style={styles.fieldDescription}
              >
                {field.description}
              </Text>
            ) : null}
            {renderField(field)}
          </Surface>
        ))}
      </Page>
    </>
  );
};

export default PackFormScreen;

// ─────────────────────────────────────────────────────────
// Screen Styles
// ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  recall: {
    gap: spacing.md,
  },
  recallItem: {
    gap: spacing.xxs,
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  fieldDescription: {
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    flex: 1,
    lineHeight: 22,
  },
  requiredBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
});

// ─────────────────────────────────────────────────────────
// Field Component Styles
// ─────────────────────────────────────────────────────────

const fieldStyles = StyleSheet.create({
  // LIKERT
  likertContainer: { gap: spacing.md },
  likertRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  likertTarget: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 52,
    borderRadius: radius.md,
    // Present on BOTH states (transparent when selected) so picking an answer
    // never shifts the row by a hairline.
    borderWidth: borderWidth.hairline,
    justifyContent: "center",
    alignItems: "center",
  },
  likertLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
  },

  // SLIDER
  sliderContainer: { gap: spacing.xs },

  // BOOLEAN TOGGLE
  toggleRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: borderWidth.hairline,
    justifyContent: "center",
    alignItems: "center",
  },

  // TEXT_INPUT
  textInputSingle: {
    minHeight: 48,
    paddingVertical: spacing.md,
  },
  counter: {
    marginTop: spacing.xs,
    textAlign: "right",
  },
  textInput: {
    borderRadius: radius.input,
    borderWidth: 1,
    padding: spacing.lg,
    fontFamily: fonts.regular,
    fontSize: 15,
    minHeight: 120,
    lineHeight: 22,
  },

  // MULTIPLE_CHOICE
  mcContainer: { gap: spacing.sm },
  mcOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  mcRadio: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  mcRadioDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
  },
  mcOptionText: {
    flex: 1,
  },
});
