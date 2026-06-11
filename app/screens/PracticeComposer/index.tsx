import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
import { POST_TEMPLATES } from "../../constants/postTemplates";
import {
  candidateFieldsFor,
  defaultActivityNameForKind,
  templatesForActivity,
} from "../../util/functions/post";
import { useUserStore } from "../../stores/user";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import SignalCard from "../../components/SignalCard";
import BottomSheetModal from "../../components/BottomSheetModal";
import Button from "../../components/Button";

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
  streakDays: "Streak",
  xpEarned: "XP earned",
  leveledUp: "Level up",
  levelStageTitle: "Level",
  milestoneLabel: "Milestone",
  growthDelta: "Growth",
};

const PracticeComposer = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const user = useUserStore((s) => s.user);

  const params = route.params ?? {};
  const activityId: string | undefined = params.activityId;
  const activityKind: ActivityKind = params.activityKind ?? "READING_PRACTICE";
  const activityName: string | undefined = params.activityName;

  const [threadId, setThreadId] = useState<string | null>(null);

  const offeredTemplates = useMemo(() => templatesForActivity(activityKind), [activityKind]);
  const allCandidates = useMemo(() => candidateFieldsFor(activityKind), [activityKind]);

  const [templateId, setTemplateId] = useState<TemplateId>(offeredTemplates[0]);
  const [resolved, setResolved] = useState<PracticePayload | null>(null);
  const [includedFields, setIncludedFields] = useState<PracticePayloadField[]>([]);
  const [caption, setCaption] = useState("");
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
  }, [resolved, allCandidates]);

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
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert("Couldn't share", "Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const canPost = !!activityId && !!threadId;

  return (
    <BottomSheetModal
      visible={true}
      onClose={handleClose}
      maxHeight="95%"
      showHandle
      showCloseButton
      backgroundColor="#FFFDF9"
    >
      <View style={styles.container}>
        <Text style={styles.sheetTitle}>Share with your buddy</Text>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 8}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>PREVIEW</Text>
          {loadingPreview ? (
            <View style={styles.previewLoading}>
              <ActivityIndicator color="#FF6B00" />
            </View>
          ) : (
            <SignalCard signal={draftSignal} variant="preview" />
          )}

          {availableFields.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>WHAT TO SHOW</Text>
              <View style={styles.toggleRow}>
                {availableFields.map((f) => {
                  const on = includedFields.includes(f);
                  return (
                    <TouchableOpacity
                      key={f}
                      activeOpacity={0.7}
                      onPress={() => toggleField(f)}
                      style={[styles.toggleChip, on && styles.toggleChipOn]}
                    >
                      <MaterialCommunityIcons name={on ? "check" : "plus"} size={14} color={on ? "#FFFFFF" : "#737780"} />
                      <Text style={[styles.toggleText, on && styles.toggleTextOn]}>{FIELD_LABELS[f]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}

          <Text style={styles.sectionLabel}>ADD A NOTE (OPTIONAL)</Text>
          <TextInput
            style={styles.captionInput}
            placeholder="Say something about this session…"
            placeholderTextColor="#A1A4AA"
            value={caption}
            onChangeText={setCaption}
            maxLength={CAPTION_MAX}
            multiline
          />
          <Text style={styles.captionCount}>
            {caption.length}/{CAPTION_MAX}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          text="Share with buddy"
          onPress={handlePost}
          disabled={!canPost}
          loading={posting}
          leftIcon="paper-plane"
        />
      </View>
    </View>
    </BottomSheetModal>
  );
};

export default PracticeComposer;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFDF9" },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#401B00",
    textAlign: "center",
    marginTop: 48,
    marginBottom: 8,
  },
  scroll: { padding: 16, paddingBottom: 32 },
  sectionLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 1, color: "#A1A4AA", marginTop: 16, marginBottom: 10 },
  previewLoading: { height: 160, alignItems: "center", justifyContent: "center" },
  toggleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  toggleChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, backgroundColor: "#FFF0E5" },
  toggleChipOn: { backgroundColor: "#FF6B00" },
  toggleText: { fontSize: 13, fontWeight: "700", color: "#737780" },
  toggleTextOn: { color: "#FFFFFF" },
  captionInput: {
    minHeight: 80,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFDABF",
    backgroundColor: "#FFFFFF",
    padding: 14,
    fontSize: 15,
    color: "#401B00",
    textAlignVertical: "top",
  },
  captionCount: { alignSelf: "flex-end", fontSize: 12, color: "#A1A4AA", marginTop: 6 },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)", backgroundColor: "#FFFDF9" },
});
