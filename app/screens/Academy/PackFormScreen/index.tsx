import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";
import { submitFormResponse } from "../../../api";
import {
  FormConfiguration,
  FormField,
  FormFieldType,
} from "../../../api/packs/types";
import { BreakthroughMetadata } from "../../../api/forms/types";
import BreakthroughModal from "../../../components/BreakthroughModal";
import PressableScale from "../../../components/PressableScale";
import {
  Button,
  Page,
  Surface,
  Text,
  fonts,
  radius,
  spacing,
  useTheme,
} from "../../../design-system";
import {
  showErrorBottomSheet,
  showSuccessBottomSheet,
} from "../../../util/functions/bottomSheet";

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
  const current = value ?? Math.round((min + max) / 2);

  return (
    <View style={fieldStyles.sliderContainer}>
      <Slider
        style={{ width: "100%", height: 40 }}
        minimumValue={min}
        maximumValue={max}
        step={1}
        value={current}
        onValueChange={onChange}
        minimumTrackTintColor={accent}
        maximumTrackTintColor={colors.surface.row}
        thumbTintColor={accent}
      />
      <View style={fieldStyles.likertLabels}>
        <Text variant="caption" color="tertiary">
          {field.minLabel || String(min)}
        </Text>
        <Text variant="title" color="primary">
          {current}
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

/** TEXT_INPUT — multiline text area */
const TextInputField: React.FC<FieldProps> = ({ field, value, onChange }) => {
  const { colors } = useTheme();
  return (
    <TextInput
      style={[
        fieldStyles.textInput,
        {
          backgroundColor: colors.input.bg,
          borderColor: colors.input.border,
          color: colors.text.primary,
        },
      ]}
      value={value || ""}
      onChangeText={onChange}
      placeholder={field.placeholder || "Type your response..."}
      placeholderTextColor={colors.input.placeholder}
      multiline
      numberOfLines={4}
      textAlignVertical="top"
    />
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
  const [breakthroughData, setBreakthroughData] = useState<BreakthroughMetadata | null>(null);

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
      Alert.alert(
        "Incomplete",
        "Please answer all required fields before submitting.",
      );
      return;
    }

    try {
      setSubmitting(true);
      const { breakthrough } = await submitFormResponse(formId, answers, { packId, moduleId });

      // Persist completion locally
      const storageKey = `pack-${packId}-module-${moduleId}-form-${blockId}`;
      await AsyncStorage.setItem(storageKey, "true");

      if (breakthrough) {
        // EXCLUSIVE SIGNALING: Breakthrough Modal takes precedence
        setBreakthroughData(breakthrough);
      } else {
        // EXCLUSIVE SIGNALING: Fallback to standard snackbar
        showSuccessBottomSheet(
          "Reflection Saved",
          "Your response has been recorded.",
        );
        navigation.goBack();
      }
    } catch (error: any) {
      console.error("Form submission failed:", error);
      showErrorBottomSheet(
        "Submission Failed",
        "Something went wrong. Please try again.",
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
        title={configuration.title || "Reflection"}
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
        {configuration?.description ? (
          <Text variant="body" color="secondary" style={styles.description}>
            {configuration.description}
          </Text>
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
            {renderField(field)}
          </Surface>
        ))}
      </Page>

      <BreakthroughModal
        visible={!!breakthroughData}
        data={breakthroughData}
        onClose={() => {
          setBreakthroughData(null);
          navigation.goBack();
        }}
      />
    </>
  );
};

export default PackFormScreen;

// ─────────────────────────────────────────────────────────
// Screen Styles
// ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  description: {
    lineHeight: 22,
    paddingHorizontal: spacing.xs,
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    gap: spacing.sm,
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
    justifyContent: "center",
    alignItems: "center",
  },

  // TEXT_INPUT
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
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  mcRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  mcOptionText: {
    flex: 1,
  },
});
