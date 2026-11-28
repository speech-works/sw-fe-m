import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { submitFormResponse } from "../../../api";
import { getFormRecall } from "../../../api/packs";
import {
  FormConfiguration,
  FormField,
  FormFieldType,
  FormRecallItem,
} from "../../../api/packs/types";
import PressableScale from "../../../components/PressableScale";
import { zoneTitleSize } from "../../../components/Pack/dayStepFrame";
import {
  ON_ORANGE_DISC,
  ON_ORANGE_MUTED,
  PIP_HALF_WAVE,
  PIP_HIDE,
  ZONE_TEXT_X,
  sheetFill,
} from "../../../components/Pack/zoneSheet";
import { PipOnEdge, pipEdgeBox } from "../../../components/Pip/PipOnEdge";
import type { PipOnEdgeHandle } from "../../../components/Pip/PipOnEdge";
import { MOMENT_SPOT, momentFxNow } from "../../../components/Pip/fx/momentFx";
import { FxFront, FxFrontHost } from "../../../components/Pip/fx/FxPortal";
import {
  Button,
  Icon,
  Text,
  haptics,
  borderWidth,
  fonts,
  radius,
  spacing,
  useTheme,
  useKeyboardInset,
} from "../../../design-system";
import {
  showErrorBottomSheet,
  showSavedBottomSheet,
} from "../../../util/functions/bottomSheet";
import { noteStepSaved } from "../../../util/packs/dayRefresh";
import {
  GUESS_FORM_KEY,
  formSavedMessage,
  formScreenHeader,
  initialFormAnswers,
  isFieldRequired,
  toggleTick,
} from "../../../util/packs/formBlock";
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
      /** The step's own words from the day card. Shown under the title. */
      descriptionOverride?: string;
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
  const placeholder = field.placeholder || "Type your response...";
  // A text area draws its grey example itself, on top of the empty box. The
  // iPhone's own placeholder sized itself apart from our measure and cut the
  // last line ("...say okay and serve" with "me." gone). The drawn example
  // and the box now share one height: the box grows to the example's height
  // plus one line, so the example always fits.
  const [exampleHeight, setExampleHeight] = useState(0);
  // Typing: the field's border turns the brand orange (#FF9040), in both schemes.
  const [focused, setFocused] = useState(false);
  const boxMinHeight = field.singleLine
    ? undefined
    : Math.max(120, exampleHeight > 0 ? exampleHeight + 22 : 0);

  const handleChange = (next: string) => {
    // Hard stop: a paste or a keystroke that would pass the word limit is not taken.
    // A box can only start over the limit when it opened with an earlier
    // answer (defaultValue), and then any edit that shortens it is taken, so
    // the person can cut it down instead of being stuck.
    const max = field.maxWords;
    const shortensOverLimit = max !== undefined && words > max && next.length < text.length;
    if (max === undefined || wordCount(next) <= max || shortensOverLimit) {
      onChange(next);
    }
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
      <View>
        <TextInput
          style={[
            fieldStyles.textInput,
            field.singleLine ? fieldStyles.textInputSingle : null,
            boxMinHeight ? { minHeight: boxMinHeight } : null,
            // web: no browser focus ring, the orange border is the focus mark
            Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null,
            {
              backgroundColor: colors.input.bg,
              borderColor: focused ? colors.action.primary : colors.input.border,
              color: colors.text.primary,
            },
          ]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          value={text}
          onChangeText={handleChange}
          placeholder={field.singleLine ? placeholder : undefined}
          placeholderTextColor={colors.input.placeholder}
          // The drawn example is hidden from screen readers, so they read it here.
          accessibilityHint={field.singleLine ? undefined : placeholder}
          maxLength={field.maxLength}
          {...(field.singleLine
            ? { multiline: false }
            : // No numberOfLines: since RN 0.79 it also caps iOS at 4 lines, which
              // cut long examples off mid-sentence. minHeight keeps the 4-line
              // look, and the box grows with its example and with typing.
              { multiline: true, textAlignVertical: "top" as const })}
        />
        {!field.singleLine && text.length === 0 ? (
          <RNText
            // Plain RN Text, not the design-system one, which sets its own font
            // size over ours. Same font, size, line height and padding as the
            // box. Taps go through to the box under it.
            pointerEvents="none"
            style={[
              fieldStyles.textInput,
              fieldStyles.exampleOverlay,
              { color: colors.input.placeholder },
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onLayout={(e) => setExampleHeight(e.nativeEvent.layout.height)}
          >
            {placeholder}
          </RNText>
        ) : null}
      </View>
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

/**
 * MULTIPLE_CHOICE: round buttons for one answer, square tick boxes when the
 * field allows several ("Pick as many as you want").
 */
const MultipleChoiceField: React.FC<FieldProps> = ({
  field,
  value,
  onChange,
  accent,
  onAccent,
}) => {
  const { colors } = useTheme();
  const options = field.options || [];
  const many = field.multiple === true;
  return (
    <View style={fieldStyles.mcContainer}>
      {options.map((option, idx) => {
        const isSelected = many
          ? Array.isArray(value) && value.includes(option)
          : value === option;
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
            accessibilityRole={many ? "checkbox" : "radio"}
            accessibilityState={many ? { checked: isSelected } : { selected: isSelected }}
            onPress={() =>
              onChange(many ? toggleTick(value, option, options) : option)
            }
          >
            <View
              style={[
                fieldStyles.mcRadio,
                many && fieldStyles.mcTick,
                {
                  borderColor: isSelected ? accent : colors.border.strong,
                },
                many && isSelected && { backgroundColor: accent },
              ]}
            >
              {isSelected && !many && (
                <View
                  style={[
                    fieldStyles.mcRadioDot,
                    { backgroundColor: accent },
                  ]}
                />
              )}
              {isSelected && many && (
                <RNText style={[fieldStyles.mcTickMark, { color: onAccent }]}>
                  ✓
                </RNText>
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

  // ONE ACCENT: the brand orange (founder, 2026-11-27: the log's action is orange; purple stays only as the small "Log"
  // label on the card). `accentKey` from the card is no longer used here.
  const { scheme } = useTheme();
  const accent = colors.action.primary;
  const onAccent = colors.action.onPrimary;
  const sheetBg = sheetFill(colors, scheme);
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const keyboardOpen = useKeyboardOpen();
  const keyboardInset = useKeyboardInset();

  // A text box opens with the person's earlier answer when the day asks for
  // it (defaultValue). Everything else starts empty. See initialFormAnswers.
  const [answers, setAnswers] = useState<Record<string, any>>(() =>
    initialFormAnswers(configuration),
  );
  const [submitting, setSubmitting] = useState(false);
  // REFLECTION SAVED (Pip moment P5, founder 2026-11-28): notes saved -> Pip comes up from behind the sheet's edge at the
  // right of the title, the jar of notes plays (your note folds into a heart and drops in), and the Save bar says
  // "Saved to your notes." Then the screen closes. A guess is not a note: it keeps its own saved sheet.
  const [savedLine, setSavedLine] = useState<string | null>(null);
  const savePip = useRef<PipOnEdgeHandle>(null);
  const scrollRef = useRef<ScrollView>(null);
  const jar = useMemo(() => momentFxNow("reflection-saved"), []);
  const header = formScreenHeader(
    configuration,
    route.params.titleOverride,
    route.params.descriptionOverride,
  );

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
    const fields = configuration?.fields || [];
    return fields
      .filter((f) => isFieldRequired(f, fields, answers))
      .every((f) => {
        const val = answers[f.id];
        if (Array.isArray(val)) return val.length > 0;
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
      await submitFormResponse(formId, answers, { packId, moduleId, blockId });

      // Persist completion locally
      const storageKey = `pack-${packId}-module-${moduleId}-form-${blockId}`;
      await AsyncStorage.setItem(storageKey, "true");
      // Tells the day screen this answer is new, so a later block built from
      // answers (the week review) is fetched again. See util/packs/dayRefresh.
      noteStepSaved(packId, moduleId, blockId);

      // ONE OUTCOME, ALWAYS. A "breakthrough" modal used to pre-empt this —
      // see the note in `api/forms/types.ts` for why it is gone.
      if (configuration?.formKey !== GUESS_FORM_KEY && savePip.current) {
        Keyboard.dismiss();
        scrollRef.current?.scrollTo({ y: 0, animated: true });   // Pip's spot is at the top of the sheet
        setSavedLine("Saved to your notes.");
        await savePip.current.rise({ quiet: true });             // he comes up and the jar plays (resolves when it ends)
        navigation.goBack();
        return;
      }
      const saved = formSavedMessage(configuration?.formKey);
      showSavedBottomSheet(saved.title, saved.body);
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

  const fields = configuration?.fields || [];
  const subLine = header.description?.trim() || "";
  const titleType = zoneTitleSize(header.title, screenW - 2 * ZONE_TEXT_X);
  const ink = colors.action.onPrimary;
  // Pip's place for the jar: at the right of the zone, a whole wave's reach inside the sheet's round corner (as the day
  // frame's right-hand Pip), the lab's size (132 at 390 wide)
  const pipSize = Math.round((132 * screenW) / 390);
  const pipLeft = Math.round(screenW - radius.sheet - 2 - PIP_HALF_WAVE * pipSize - pipSize / 2);

  return (
    <FxFront>
    <View style={[styles.root, { backgroundColor: colors.action.primary }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      {/* iOS: KeyboardAvoidingView. Android: a plain View padded by the real
          keyboard height. With edge-to-edge the window never resizes, and
          KeyboardAvoidingView's "height" mode can stay shrunk after the keyboard
          closes, which showed the orange root under the Save bar. */}
      <KeyboardWrap style={styles.fill} inset={keyboardInset}>
        <ScrollView
          ref={scrollRef}
          style={styles.fill}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ORANGE ZONE (medium): back disc, the form title and its sub line. The sub line owns its top gap. */}
          <View style={{ paddingTop: insets.top + HEAD_TOP }}>
            <View style={styles.headRow}>
              <Pressable
                onPress={() => {
                  haptics.light();
                  navigation.goBack();
                }}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={8}
                style={({ pressed }) => [styles.disc, pressed && styles.pressed]}
              >
                <Icon name="arrow-left" size={22} color={ink} />
              </Pressable>
            </View>
            <View style={styles.zoneText}>
              <Text
                accessibilityRole="header"
                style={[
                  styles.zoneTitle,
                  {
                    color: ink,
                    fontSize: titleType.fontSize,
                    lineHeight: titleType.lineHeight,
                  },
                ]}
              >
                {header.title}
              </Text>
              {subLine ? <Text style={styles.zoneSub}>{subLine}</Text> : null}
            </View>
            {/* Pip on the sheet's edge, hidden behind it until the notes are saved (the sheet is drawn over him) */}
            <View pointerEvents="none" style={[styles.savePip, { left: pipLeft, width: pipSize, height: pipEdgeBox(pipSize, PIP_HIDE).visible }]}>
              <PipOnEdge ref={savePip} size={pipSize} hide={PIP_HIDE} face="listening" effect={jar} design={MOMENT_SPOT["reflection-saved"]} clipBelow={radius.sheet + 2} />
            </View>
          </View>

          {/* SHEET: question + field blocks. No card, no lines; each block owns its bottom gap. */}
          <View style={[styles.sheet, { backgroundColor: sheetBg }]}>
            {recall.length > 0 ? (
              <View
                style={[
                  styles.recall,
                  {
                    backgroundColor: colors.surface.row,
                    borderColor: colors.border.hairline,
                  },
                ]}
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
            ) : null}

            {fields.map((field) => {
              const required = isFieldRequired(field, fields, answers);
              return (
                <View key={field.id} style={styles.block}>
                  <Text style={[styles.question, { color: colors.text.primary }]}>
                    {field.label}
                    {required ? (
                      <Text style={[styles.requiredTag, { color: colors.text.accent }]}>
                        {"  Required"}
                      </Text>
                    ) : null}
                  </Text>
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
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* SAVE BAR: pinned at the bottom (on the keyboard when it is open). The hairline belongs to the bar. */}
        <View
          style={[
            styles.saveBar,
            {
              backgroundColor: sheetBg,
              borderTopColor: colors.border.hairline,
              // Android's keyboard height excludes the nav bar, so keep that gap while open.
              paddingBottom:
                keyboardOpen && Platform.OS === "ios" ? 12 : Math.max(insets.bottom, 16),
            },
          ]}
        >
          {savedLine ? (
            <View style={styles.savedLine} accessibilityLiveRegion="polite">
              <Icon name="check" size={20} color={colors.text.primary} />
              <Text variant="body" color="primary">{savedLine}</Text>
            </View>
          ) : (
            <Button
              label="Save"
              leftIcon="check"
              loading={submitting}
              disabled={!allRequiredFilled}
              onPress={handleSubmit}
            />
          )}
        </View>
      </KeyboardWrap>
      {/* the jar plays over the sheet (the sheet is drawn over Pip) */}
      <FxFrontHost />
    </View>
    </FxFront>
  );
};

const KeyboardWrap: React.FC<{
  style: object;
  inset: number;
  children: React.ReactNode;
}> = ({ style, inset, children }) =>
  Platform.OS === "ios" ? (
    <KeyboardAvoidingView style={style} behavior="padding">
      {children}
    </KeyboardAvoidingView>
  ) : (
    <View style={[style, { paddingBottom: inset }]}>{children}</View>
  );

/** true while the on-screen keyboard is up (the Save bar then sits on it with a smaller bottom pad). */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const showEv = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEv = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const a = Keyboard.addListener(showEv, () => setOpen(true));
    const b = Keyboard.addListener(hideEv, () => setOpen(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return open;
}

export default PackFormScreen;

// ─────────────────────────────────────────────────────────
// Screen Styles
// ─────────────────────────────────────────────────────────

/** Back disc: 8 under the status bar, 44 round (the day frame's numbers). */
const HEAD_TOP = 8;
const DISC = 44;

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  headRow: { paddingHorizontal: 16, minHeight: DISC, justifyContent: "center" },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    backgroundColor: ON_ORANGE_DISC,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { transform: [{ scale: 0.96 }] },
  zoneText: { paddingHorizontal: ZONE_TEXT_X, paddingTop: 12, paddingBottom: 24 },
  zoneTitle: { fontFamily: fonts.extrabold, fontWeight: "800", letterSpacing: -0.7 },
  zoneSub: {
    marginTop: 6,
    fontFamily: fonts.medium,
    fontWeight: "500",
    fontSize: 14,
    lineHeight: 20,
    color: ON_ORANGE_MUTED,
  },
  sheet: {
    flexGrow: 1,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: 28,
    paddingHorizontal: ZONE_TEXT_X,
  },
  // a question and its field: one block with its own bottom gap
  block: { marginBottom: 24 },
  question: {
    fontFamily: fonts.semibold,
    fontWeight: "600",
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 12,
  },
  requiredTag: { fontFamily: fonts.medium, fontWeight: "500", fontSize: 12 },
  // Pip's box ends on the sheet's edge (the zone's bottom); PipOnEdge hangs his hidden part below it, under the sheet
  savePip: { position: "absolute", bottom: 0, justifyContent: "flex-end" },
  // where Save was: the same height as the button, so nothing jumps
  savedLine: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveBar: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  recall: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  recallItem: {
    gap: spacing.xxs,
  },
  fieldDescription: {
    marginTop: -4,
    marginBottom: 12,
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
    minHeight: 52,
    paddingVertical: spacing.md,
  },
  counter: {
    marginTop: spacing.xs,
    textAlign: "right",
  },
  textInput: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.regular,
    fontSize: 15,
    minHeight: 120,
    lineHeight: 22,
  },
  // The grey example drawn over an empty text area. Out of the flow, the
  // box's width, the same padding and a clear border, so its first letter
  // sits where the cursor is (checked on the iPhone simulator).
  exampleOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    minHeight: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
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
  mcTick: {
    borderRadius: radius.xs,
  },
  mcTickMark: {
    fontSize: 14,
    lineHeight: 16,
    fontFamily: fonts.bold,
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
