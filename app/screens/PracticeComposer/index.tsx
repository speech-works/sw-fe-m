import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import {
  ActivityKind,
  CreatePracticeInput,
  PracticePayload,
  PracticePayloadField,
  PracticeSignal,
  TemplateId,
  createPracticeSignal,
  getThread,
  previewPracticeSignal,
} from "../../api/threads";
import {
  candidateFieldsFor,
  defaultActivityNameForKind,
  templatesForActivity,
} from "../../util/functions/post";
import { useUserStore } from "../../stores/user";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import SignalCard from "../../components/SignalCard";
import PressableScale from "../../components/PressableScale";
import {
  Button,
  Icon,
  IconButton,
  Sheet,
  Text,
  borderWidth,
  icons,
  radius,
  spacing,
  type SemanticColors,
  useTheme,
  withAlpha,
  darkenForContrast,
  mix,
  AA_LARGE,
} from "../../design-system";

const CAPTION_MAX = 280;

const deriveTimeOfDay = (): PracticePayload["timeOfDay"] => {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
};

const hasValue = (p: PracticePayload, f: PracticePayloadField): boolean => {
  const v = (p as any)[f];
  if (v == null) return false;
  if (typeof v === "boolean") return v === true;
  return true;
};

const FIELD_LABELS: Record<PracticePayloadField, string> = {
  activityName: "Activity",
  durationSeconds: "Duration",
  timeOfDay: "Time of day",
  showedUp: "Showed up",
  streakDays: "Days in a row",
  xpEarned: "Growth earned",
  leveledUp: "Level up",
  levelStageTitle: "Level",
  milestoneLabel: "Milestone",
  growthDelta: "Evolution",
  journeyTitle: "Journey",
  moduleTitle: "Focus",
  journeyProgress: "Progress",
  // moduleCompleted/journeyCompleted are server-emitted milestone facts, never user
  // toggles (absent from candidateFieldsFor). Labels exist only to satisfy the Record type.
  moduleCompleted: "Module done",
  journeyCompleted: "Journey done",
};

const parentAccentForKind = (
  kind: ActivityKind,
  colors: SemanticColors,
): { color: string; onColor: string } => {
  switch (kind) {
    case "READING_PRACTICE":
      return { color: colors.category.reading, onColor: colors.categoryOn.reading };
    case "FUN_PRACTICE":
      return { color: colors.category.fun, onColor: colors.categoryOn.fun };
    case "COGNITIVE_PRACTICE":
      return { color: colors.category.breathing, onColor: colors.categoryOn.breathing };
    case "EXPOSURE_PRACTICE":
      return { color: colors.category.exposure, onColor: colors.categoryOn.exposure };
    case "TECHNIQUE_PRACTICE":
    default:
      return { color: colors.category.reading, onColor: colors.categoryOn.reading };
  }
};

const PracticeComposer = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const user = useUserStore((s) => s.user);

  const params = route.params ?? {};
  const activityId: string | undefined = params.activityId;
  const activityKind: ActivityKind = params.activityKind ?? "READING_PRACTICE";
  const activityName: string | undefined = params.activityName;
  const fallbackAccent = parentAccentForKind(activityKind, colors);
  const accentColor: string = params.accentColor ?? fallbackAccent.color;
  const onAccentColor: string = params.onAccentColor ?? fallbackAccent.onColor;
  const accentWash = withAlpha(accentColor, 0.16);
  const accentBorder = withAlpha(accentColor, 0.46);
  // The share icon is colored foreground on the accent wash disc — darken the
  // threaded hue to clear AA on paper (a no-op on dark). Keep bright `accentColor`
  // for the wash/border fills and the spinner below.
  const accentFg = darkenForContrast(accentColor, mix(colors.surface.elevated, accentColor, 0.16), AA_LARGE);
  const subtleText = colors.text.secondary;

  const [threadId, setThreadId] = useState<string | null>(null);

  const offeredTemplates = useMemo(() => templatesForActivity(activityKind), [activityKind]);
  const allCandidates = useMemo(() => candidateFieldsFor(activityKind), [activityKind]);

  const [templateId, setTemplateId] = useState<TemplateId>(offeredTemplates[0]);
  const [resolved, setResolved] = useState<PracticePayload | null>(null);
  const [includedFields, setIncludedFields] = useState<PracticePayloadField[]>([]);
  const [caption, setCaption] = useState("");
  const [captionFocused, setCaptionFocused] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [posting, setPosting] = useState(false);

  // Resolve the buddy thread this practice will be shared into.
  useEffect(() => {
    getThread()
      .then((t) => setThreadId(t?.id ?? null))
      .catch(() => setThreadId(null));
  }, []);

  useEffect(() => {
    track(ANALYTICS_EVENTS.POST_COMPOSER_OPENED, { source: "done_practice", activityKind });
  }, [activityKind]);

  // Resolve the safe payload once (truthful values from the server). Falls back to only the
  // fields known client-side — never fabricates server-derived values like streak/xp.
  useEffect(() => {
    if (!activityId || !threadId) return;
    let active = true;
    const fallbackName = activityName || defaultActivityNameForKind(activityKind);
    (async () => {
      try {
        const payload = await previewPracticeSignal(threadId, {
          activityId,
          templateId: offeredTemplates[0],
          includedFields: allCandidates,
        });
        if (!active) return;
        setResolved({ ...payload, activityName: payload.activityName || fallbackName });
      } catch {
        if (!active) return;
        setResolved({ v: 1, activityName: fallbackName, timeOfDay: deriveTimeOfDay(), showedUp: true });
      } finally {
        if (active) setLoadingPreview(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [activityId, threadId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Default to showing every available field once resolved.
  useEffect(() => {
    if (!resolved) return;
    setIncludedFields(allCandidates.filter((f) => f !== "activityName" && hasValue(resolved, f)));
    // Finishing a module/journey is a milestone — lead with the milestone template.
    if ((resolved.moduleCompleted || resolved.journeyCompleted) && offeredTemplates.includes("milestone")) {
      setTemplateId("milestone");
    }
  }, [resolved, allCandidates, offeredTemplates]);

  const availableFields = useMemo(
    () => (resolved ? allCandidates.filter((f) => f !== "activityName" && hasValue(resolved, f)) : []),
    [resolved, allCandidates],
  );

  const draftPayload: PracticePayload = useMemo(() => {
    const name = resolved?.activityName || activityName || defaultActivityNameForKind(activityKind);
    const base: PracticePayload = { v: 1, activityName: name };
    if (resolved) {
      includedFields.forEach((f) => {
        if (f === "activityName") return;
        if (hasValue(resolved, f)) (base as any)[f] = (resolved as any)[f];
      });
      // Completion flags are server-emitted ungated (never in includedFields), so copy
      // them in explicitly — otherwise the preview wouldn't show the milestone treatment
      // the posted (BE-built) card will.
      if (resolved.moduleCompleted) base.moduleCompleted = true;
      if (resolved.journeyCompleted) base.journeyCompleted = true;
    }
    return base;
  }, [resolved, includedFields, activityName, activityKind]);

  const draftSignal: PracticeSignal = {
    id: "draft",
    threadId: threadId ?? "",
    type: "practice",
    author: {
      id: user?.id ?? "",
      name: user?.name ?? "You",
      profilePictureUrl: user?.profilePictureUrl,
    },
    authorIsMe: true,
    activityKind,
    templateId,
    payload: draftPayload,
    caption: caption.trim() || undefined,
    reactions: [],
    myReaction: null,
    createdAt: new Date(),
  };

  const toggleField = (f: PracticePayloadField) => {
    setIncludedFields((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const handleClose = () => {
    track(ANALYTICS_EVENTS.POST_CANCELLED, { activityKind });
    navigation.goBack();
  };

  const handlePost = async () => {
    if (!activityId || !threadId || posting) return;
    const input: CreatePracticeInput = {
      activityId,
      templateId,
      includedFields,
      caption: caption.trim() || undefined,
    };
    try {
      setPosting(true);
      await createPracticeSignal(threadId, input);
      track(ANALYTICS_EVENTS.POST_CREATED, {
        templateId,
        activityKind,
        hasCaption: !!caption.trim(),
        includedFields,
        isJourneyActivity: !!resolved?.journeyTitle,
        moduleCompleted: !!resolved?.moduleCompleted,
        journeyCompleted: !!resolved?.journeyCompleted,
      });
      params.onShared?.();
      navigation.goBack();
    } catch (e) {
      Alert.alert("Couldn't share", "Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const canPost = !!activityId && !!threadId;

  return (
    <Sheet
      visible
      onClose={handleClose}
      title="Share with your buddy"
      right={<IconButton name={icons.close} onPress={handleClose} />}
      contentStyle={styles.sheetContent}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: accentWash, borderColor: accentBorder }]}>
            <Icon name={icons.share} size={20} color={accentFg} />
          </View>
          <Text variant="bodySm" color="secondary" center style={styles.headerSubtitle}>
            Choose what shows up in your practice update.
          </Text>
        </View>

        <Text variant="label" color="secondary" style={styles.sectionLabel}>
          Preview
        </Text>
        {loadingPreview ? (
          <View
            style={[
              styles.previewLoading,
              { backgroundColor: colors.surface.default, borderColor: colors.border.hairline },
            ]}
          >
            <ActivityIndicator color={accentColor} />
          </View>
        ) : (
          <SignalCard signal={draftSignal} variant="preview" isFirst isLast />
        )}

        {availableFields.length > 0 ? (
          <>
            <Text variant="label" color="secondary" style={styles.sectionLabel}>
              What to show
            </Text>
            <View style={styles.toggleRow}>
              {availableFields.map((f) => {
                const on = includedFields.includes(f);
                return (
                  <PressableScale
                    key={f}
                    onPress={() => toggleField(f)}
                    scaleTo={0.96}
                    style={[
                      styles.toggleChip,
                      {
                        backgroundColor: on ? accentColor : colors.surface.control,
                        borderColor: on ? accentColor : colors.border.default,
                      },
                    ]}
                  >
                    <Icon name={on ? icons.success : icons.add} size={16} color={on ? onAccentColor : subtleText} />
                    <Text variant="label" color={on ? onAccentColor : subtleText}>
                      {FIELD_LABELS[f]}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </>
        ) : null}

        <Text variant="label" color="secondary" style={styles.sectionLabel}>
          Add a note
        </Text>
        <TextInput
          style={[
            styles.captionInput,
            {
              backgroundColor: colors.surface.control,
              borderColor: captionFocused ? accentColor : colors.border.default,
              color: colors.text.primary,
            },
          ]}
          placeholder="Say something about this session..."
          placeholderTextColor={colors.text.tertiary}
          value={caption}
          onChangeText={setCaption}
          maxLength={CAPTION_MAX}
          multiline
          onFocus={() => setCaptionFocused(true)}
          onBlur={() => setCaptionFocused(false)}
        />
        <Text variant="caption" color="tertiary" style={styles.captionCount}>
          {caption.length}/{CAPTION_MAX}
        </Text>

        <Button
          label="Share with buddy"
          onPress={handlePost}
          disabled={!canPost}
          loading={posting}
          leftIcon={icons.send}
          accentColor={accentColor}
          onAccentColor={onAccentColor}
          style={styles.primaryAction}
        />
      </View>
    </Sheet>
  );
};

export default PracticeComposer;

const styles = StyleSheet.create({
  sheetContent: {
    paddingTop: spacing.lg,
  },
  container: {
    gap: spacing.xs,
  },
  header: {
    alignItems: "center",
    paddingBottom: spacing.sm,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  headerSubtitle: {
    maxWidth: 260,
  },
  sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  previewLoading: {
    height: 176,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
  },
  toggleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  toggleChip: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: borderWidth.thin,
  },
  captionInput: {
    minHeight: 92,
    borderRadius: radius.input,
    borderWidth: borderWidth.thin,
    padding: spacing.md,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: "top",
  },
  captionCount: { alignSelf: "flex-end", marginTop: spacing.xs },
  primaryAction: {
    marginTop: spacing.lg,
  },
});
