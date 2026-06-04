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
  CreatePostInput,
  Post,
  PostActivityKind,
  PostPayload,
  PostPayloadField,
  PostTemplateId,
  PostVisibility,
  createPost,
  previewPost,
} from "../../api/posts";
import { POST_TEMPLATES } from "../../constants/postTemplates";
import {
  candidateFieldsFor,
  defaultActivityNameForKind,
  templatesForActivity,
} from "../../util/functions/post";
import { useUserStore } from "../../stores/user";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import PostCard from "../../components/PostCard";

const CAPTION_MAX = 280;

const deriveTimeOfDay = (): PostPayload["timeOfDay"] => {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
};

const hasValue = (p: PostPayload, f: PostPayloadField): boolean => {
  const v = (p as any)[f];
  if (v == null) return false;
  if (typeof v === "boolean") return v === true;
  return true;
};

const FIELD_LABELS: Record<PostPayloadField, string> = {
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

const PostComposer = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const user = useUserStore((s) => s.user);

  const params = route.params ?? {};
  const activityId: string | undefined = params.activityId;
  const activityKind: PostActivityKind = params.activityKind ?? "READING_PRACTICE";
  const activityName: string | undefined = params.activityName;
  const visibility: PostVisibility = params.visibility ?? "buddy";

  const offeredTemplates = useMemo(
    () => templatesForActivity(activityKind),
    [activityKind],
  );
  const allCandidates = useMemo(
    () => candidateFieldsFor(activityKind),
    [activityKind],
  );

  const [templateId, setTemplateId] = useState<PostTemplateId>(offeredTemplates[0]);
  const [resolved, setResolved] = useState<PostPayload | null>(null);
  const [includedFields, setIncludedFields] = useState<PostPayloadField[]>([]);
  const [caption, setCaption] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    track(ANALYTICS_EVENTS.POST_COMPOSER_OPENED, {
      source: "done_practice",
      activityKind,
      visibility,
    });
  }, [activityKind, visibility]);

  // Resolve the safe payload once (truthful values from the server). If the preview
  // endpoint isn't available, fall back to only the fields we know client-side —
  // never fabricate server-derived values like streak/xp.
  useEffect(() => {
    if (!activityId) {
      setLoadingPreview(false);
      return;
    }
    let active = true;
    const fallbackName = activityName || defaultActivityNameForKind(activityKind);
    (async () => {
      try {
        const payload = await previewPost({
          activityId,
          templateId: offeredTemplates[0],
          includedFields: allCandidates,
          visibility,
        });
        if (!active) return;
        setResolved({ ...payload, activityName: payload.activityName || fallbackName });
      } catch {
        if (!active) return;
        setResolved({
          v: 1,
          activityName: fallbackName,
          timeOfDay: deriveTimeOfDay(),
          showedUp: true,
        });
      } finally {
        if (active) setLoadingPreview(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [activityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Default to showing every available field once resolved.
  useEffect(() => {
    if (!resolved) return;
    setIncludedFields(
      allCandidates.filter((f) => f !== "activityName" && hasValue(resolved, f)),
    );
  }, [resolved, allCandidates]);

  const availableFields = useMemo(
    () =>
      resolved
        ? allCandidates.filter((f) => f !== "activityName" && hasValue(resolved, f))
        : [],
    [resolved, allCandidates],
  );

  const draftPayload: PostPayload = useMemo(() => {
    const name =
      resolved?.activityName || activityName || defaultActivityNameForKind(activityKind);
    const base: PostPayload = { v: 1, activityName: name };
    if (resolved) {
      includedFields.forEach((f) => {
        if (f === "activityName") return;
        if (hasValue(resolved, f)) (base as any)[f] = (resolved as any)[f];
      });
    }
    return base;
  }, [resolved, includedFields, activityName, activityKind]);

  const draftPost: Post = {
    id: "draft",
    kind: "card",
    visibility,
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

  const toggleField = (f: PostPayloadField) => {
    setIncludedFields((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  };

  const handleSelectTemplate = (t: PostTemplateId) => {
    setTemplateId(t);
    track(ANALYTICS_EVENTS.POST_TEMPLATE_SELECTED, { templateId: t, activityKind });
  };

  const handleClose = () => {
    track(ANALYTICS_EVENTS.POST_CANCELLED, { activityKind });
    navigation.goBack();
  };

  const handlePost = async () => {
    if (!activityId || posting) return;
    const input: CreatePostInput = {
      activityId,
      templateId,
      includedFields,
      caption: caption.trim() || undefined,
      visibility,
    };
    try {
      setPosting(true);
      await createPost(input);
      track(ANALYTICS_EVENTS.POST_CREATED, {
        templateId,
        activityKind,
        visibility,
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

  const offered = POST_TEMPLATES.filter((t) => offeredTemplates.includes(t.id));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.headerBtn} hitSlop={8}>
          <MaterialCommunityIcons name="close" size={22} color="#401B00" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share to your buddy</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 8}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Template carousel */}
          <Text style={styles.sectionLabel}>CHOOSE A STYLE</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
          >
            {offered.map((t) => {
              const selected = t.id === templateId;
              return (
                <TouchableOpacity
                  key={t.id}
                  activeOpacity={0.8}
                  onPress={() => handleSelectTemplate(t.id)}
                  style={[styles.templateChip, selected && styles.templateChipSelected]}
                >
                  <LinearGradient
                    colors={t.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.templateIcon}
                  >
                    <MaterialCommunityIcons name={t.icon as any} size={18} color="#FFF" />
                  </LinearGradient>
                  <Text style={[styles.templateLabel, selected && styles.templateLabelSelected]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Live preview */}
          <Text style={styles.sectionLabel}>PREVIEW</Text>
          {loadingPreview ? (
            <View style={styles.previewLoading}>
              <ActivityIndicator color="#FF6B00" />
            </View>
          ) : (
            <PostCard post={draftPost} variant="preview" />
          )}

          {/* Field toggles */}
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
                      <MaterialCommunityIcons
                        name={on ? "check" : "plus"}
                        size={14}
                        color={on ? "#FFFFFF" : "#737780"}
                      />
                      <Text style={[styles.toggleText, on && styles.toggleTextOn]}>
                        {FIELD_LABELS[f]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}

          {/* Caption */}
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

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handlePost}
          disabled={posting || !activityId}
          style={[styles.postBtn, (posting || !activityId) && styles.postBtnDisabled]}
        >
          {posting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />
              <Text style={styles.postBtnText}>Share with buddy</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PostComposer;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFDF9" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#401B00" },
  scroll: { padding: 16, paddingBottom: 32 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#A1A4AA",
    marginTop: 16,
    marginBottom: 10,
  },
  carousel: { gap: 12, paddingRight: 8 },
  templateChip: {
    alignItems: "center",
    width: 76,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  templateChipSelected: {
    borderColor: "#FF6B00",
    backgroundColor: "#FFFFFF",
  },
  templateIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  templateLabel: { fontSize: 12, fontWeight: "700", color: "#A1A4AA" },
  templateLabelSelected: { color: "#401B00", fontWeight: "800" },
  previewLoading: {
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  toggleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: "#FFF0E5",
  },
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
  captionCount: {
    alignSelf: "flex-end",
    fontSize: 12,
    color: "#A1A4AA",
    marginTop: 6,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    backgroundColor: "#FFFDF9",
  },
  postBtn: {
    height: 52,
    borderRadius: 100,
    backgroundColor: "#FF6B00",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  postBtnDisabled: { opacity: 0.5 },
  postBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
