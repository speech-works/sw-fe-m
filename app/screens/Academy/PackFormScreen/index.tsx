import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { submitFormResponse } from "../../../api";
import {
    FormConfiguration,
    FormField,
    FormFieldType,
} from "../../../api/packs/types";
import { TactileTouchableOpacity } from "../../../components/TactileTouchableOpacity";
import { theme } from "../../../Theme/tokens";
import { parseShadowStyle } from "../../../util/functions/parseStyles";
import { triggerToast } from "../../../util/functions/toast";

type PackFormRouteProp = RouteProp<
  {
    params: {
      configuration: FormConfiguration;
      formId: string;
      packId: string;
      moduleId: string;
      blockId: string;
    };
  },
  "params"
>;

const { width } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────
// Field Renderers
// ─────────────────────────────────────────────────────────

interface FieldProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
}

/** LIKERT_5 / LIKERT_7 — discrete numbered tap targets */
const LikertField: React.FC<FieldProps & { count: number }> = ({
  field,
  value,
  onChange,
  count,
}) => {
  const targets = Array.from({ length: count }, (_, i) => i + 1);
  return (
    <View style={fieldStyles.likertContainer}>
      <View style={fieldStyles.likertRow}>
        {targets.map((n) => {
          const isSelected = value === n;
          return (
            <TactileTouchableOpacity
              key={n}
              style={[
                fieldStyles.likertTarget,
                isSelected && fieldStyles.likertTargetSelected,
              ]}
              onPress={() => onChange(n)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  fieldStyles.likertTargetText,
                  isSelected && fieldStyles.likertTargetTextSelected,
                ]}
              >
                {n}
              </Text>
            </TactileTouchableOpacity>
          );
        })}
      </View>
      {(field.minLabel || field.maxLabel) && (
        <View style={fieldStyles.likertLabels}>
          <Text style={fieldStyles.likertLabelText}>
            {field.minLabel || ""}
          </Text>
          <Text style={fieldStyles.likertLabelText}>
            {field.maxLabel || ""}
          </Text>
        </View>
      )}
    </View>
  );
};

/** SLIDER — continuous range */
const SliderField: React.FC<FieldProps> = ({ field, value, onChange }) => {
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
        minimumTrackTintColor="#6366F1"
        maximumTrackTintColor="rgba(99, 102, 241, 0.2)"
        thumbTintColor="#6366F1"
      />
      <View style={fieldStyles.likertLabels}>
        <Text style={fieldStyles.likertLabelText}>
          {field.minLabel || String(min)}
        </Text>
        <Text style={fieldStyles.sliderValueText}>{current}</Text>
        <Text style={fieldStyles.likertLabelText}>
          {field.maxLabel || String(max)}
        </Text>
      </View>
    </View>
  );
};

/** BOOLEAN_TOGGLE — Yes / No segment */
const BooleanToggleField: React.FC<FieldProps> = ({ value, onChange }) => (
  <View style={fieldStyles.toggleRow}>
    {[
      { label: "Yes", val: true },
      { label: "No", val: false },
    ].map(({ label, val }) => {
      const isSelected = value === val;
      return (
        <TactileTouchableOpacity
          key={label}
          style={[
            fieldStyles.toggleOption,
            isSelected && fieldStyles.toggleOptionSelected,
          ]}
          onPress={() => onChange(val)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              fieldStyles.toggleOptionText,
              isSelected && fieldStyles.toggleOptionTextSelected,
            ]}
          >
            {label}
          </Text>
        </TactileTouchableOpacity>
      );
    })}
  </View>
);

/** TEXT_INPUT — multiline text area */
const TextInputField: React.FC<FieldProps> = ({ field, value, onChange }) => (
  <TextInput
    style={fieldStyles.textInput}
    value={value || ""}
    onChangeText={onChange}
    placeholder={field.placeholder || "Type your response..."}
    placeholderTextColor="rgba(0,0,0,0.3)"
    multiline
    numberOfLines={4}
    textAlignVertical="top"
  />
);

/** MULTIPLE_CHOICE — radio buttons */
const MultipleChoiceField: React.FC<FieldProps> = ({
  field,
  value,
  onChange,
}) => (
  <View style={fieldStyles.mcContainer}>
    {(field.options || []).map((option, idx) => {
      const isSelected = value === option;
      return (
        <TactileTouchableOpacity
          key={idx}
          style={[
            fieldStyles.mcOption,
            isSelected && fieldStyles.mcOptionSelected,
          ]}
          onPress={() => onChange(option)}
          activeOpacity={0.7}
        >
          <View
            style={[
              fieldStyles.mcRadio,
              isSelected && fieldStyles.mcRadioSelected,
            ]}
          >
            {isSelected && <View style={fieldStyles.mcRadioDot} />}
          </View>
          <Text
            style={[
              fieldStyles.mcOptionText,
              isSelected && fieldStyles.mcOptionTextSelected,
            ]}
          >
            {option}
          </Text>
        </TactileTouchableOpacity>
      );
    })}
  </View>
);

// ─────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────

const PackFormScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<PackFormRouteProp>();
  const { configuration, formId, packId, moduleId, blockId } = route.params;

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

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
      await submitFormResponse(formId, answers, { packId, moduleId });

      // Persist completion locally
      const storageKey = `pack-${packId}-module-${moduleId}-form-${blockId}`;
      await AsyncStorage.setItem(storageKey, "true");

      triggerToast(
        "success",
        "Reflection Saved",
        "Your response has been recorded.",
      );
      navigation.goBack();
    } catch (error: any) {
      console.error("Form submission failed:", error);
      triggerToast(
        "error",
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

    switch (field.type) {
      case FormFieldType.LIKERT_5:
        return (
          <LikertField
            field={field}
            value={value}
            onChange={onChange}
            count={field.ratingMax ?? 5}
          />
        );
      case FormFieldType.LIKERT_7:
        return (
          <LikertField
            field={field}
            value={value}
            onChange={onChange}
            count={field.ratingMax ?? 7}
          />
        );
      case FormFieldType.SLIDER:
        return <SliderField field={field} value={value} onChange={onChange} />;
      case FormFieldType.BOOLEAN_TOGGLE:
        return (
          <BooleanToggleField field={field} value={value} onChange={onChange} />
        );
      case FormFieldType.TEXT_INPUT:
        return (
          <TextInputField field={field} value={value} onChange={onChange} />
        );
      case FormFieldType.MULTIPLE_CHOICE:
        return (
          <MultipleChoiceField
            field={field}
            value={value}
            onChange={onChange}
          />
        );
      default:
        return <Text style={{ color: "#999" }}>Unsupported field type</Text>;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#EEF2FF", "#FFF", "#FFF"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View style={styles.header}>
          <TactileTouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color={theme.colors.text.title}
            />
          </TactileTouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>REFLECTION</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {configuration.title || "Form"}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Fields */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {configuration?.description ? (
            <Text style={styles.description}>{configuration.description}</Text>
          ) : null}

          {(configuration?.fields || []).map((field) => (
            <View key={field.id} style={styles.fieldCard}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                {field.required && (
                  <Text style={styles.requiredBadge}>Required</Text>
                )}
              </View>
              {renderField(field)}
            </View>
          ))}

          {/* Bottom spacer for scroll clearance */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Submit Footer */}
        <View style={styles.footer}>
          <TactileTouchableOpacity
            style={[
              styles.submitButton,
              !allRequiredFilled && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting || !allRequiredFilled}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                allRequiredFilled
                  ? ["#6366F1", "#8B5CF6"]
                  : ["#CBD5E1", "#CBD5E1"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {submitting && (
                <ActivityIndicator
                  color="white"
                  size="small"
                  style={StyleSheet.absoluteFill}
                />
              )}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  opacity: submitting ? 0 : 1,
                }}
              >
                <MaterialCommunityIcons name="check" size={20} color="white" />
                <Text style={styles.submitText}>Complete</Text>
              </View>
            </LinearGradient>
          </TactileTouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default PackFormScreen;

// ─────────────────────────────────────────────────────────
// Screen Styles
// ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "transparent",
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  headerSubtitle: {
    fontSize: 10,
    textTransform: "uppercase",
    color: "#6366F1",
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text.title,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  description: {
    fontSize: 15,
    color: theme.colors.text.default,
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  fieldCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.08)",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text.title,
    flex: 1,
    lineHeight: 22,
  },
  requiredBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6366F1",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
  },
  submitButton: {
    borderRadius: 16,
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation2),
    shadowColor: "#6366F1",
    shadowOpacity: 0.3,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
  },
  submitText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});

// ─────────────────────────────────────────────────────────
// Field Component Styles
// ─────────────────────────────────────────────────────────

const fieldStyles = StyleSheet.create({
  // LIKERT
  likertContainer: { gap: 12 },
  likertRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  likertTarget: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 52,
    borderRadius: 14,
    backgroundColor: "rgba(99, 102, 241, 0.06)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(99, 102, 241, 0.12)",
  },
  likertTargetSelected: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
    ...parseShadowStyle(theme.shadow.elevation1),
    shadowColor: "#6366F1",
    shadowOpacity: 0.35,
  },
  likertTargetText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6366F1",
  },
  likertTargetTextSelected: {
    color: "white",
  },
  likertLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  likertLabelText: {
    fontSize: 12,
    color: theme.colors.text.disabled,
    fontWeight: "500",
  },

  // SLIDER
  sliderContainer: { gap: 4 },
  sliderValueText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6366F1",
    textAlign: "center",
  },

  // BOOLEAN TOGGLE
  toggleRow: {
    flexDirection: "row",
    gap: 12,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(99, 102, 241, 0.06)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(99, 102, 241, 0.12)",
  },
  toggleOptionSelected: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  toggleOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6366F1",
  },
  toggleOptionTextSelected: {
    color: "white",
  },

  // TEXT_INPUT
  textInput: {
    backgroundColor: "rgba(99, 102, 241, 0.04)",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(99, 102, 241, 0.12)",
    padding: 16,
    fontSize: 15,
    color: theme.colors.text.title,
    minHeight: 120,
    lineHeight: 22,
  },

  // MULTIPLE_CHOICE
  mcContainer: { gap: 10 },
  mcOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    backgroundColor: "rgba(99, 102, 241, 0.04)",
    borderWidth: 1.5,
    borderColor: "rgba(99, 102, 241, 0.1)",
    gap: 14,
  },
  mcOptionSelected: {
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderColor: "#6366F1",
  },
  mcRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(99, 102, 241, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  mcRadioSelected: {
    borderColor: "#6366F1",
  },
  mcRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#6366F1",
  },
  mcOptionText: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.text.default,
    flex: 1,
  },
  mcOptionTextSelected: {
    color: theme.colors.text.title,
    fontWeight: "600",
  },
});
