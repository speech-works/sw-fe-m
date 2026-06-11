import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import ScreenView from "../../components/ScreenView";
import PromptBottomSheet from "../../components/PromptBottomSheet";
import PressableScale from "../../components/PressableScale";
import { theme } from "../../Theme/tokens";
import { parseShadowStyle, parseTextStyle } from "../../util/functions/parseStyles";
import { createMomentSignal, MomentId, MomentValence, Signal } from "../../api/threads";
import { getMoment, momentsByValence } from "../../constants/momentMessages";
import { handleLinkPress } from "../../util/functions/externalLinks";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";

const C = {
  orange500: theme.colors.library.orange[500],
  orange600: theme.colors.library.orange[600],
  orange700: theme.colors.library.orange[700],
  title: theme.colors.text.title,
  textMuted: theme.colors.text.default,
  peachSurface: theme.colors.library.orange[100],
  warmBorder: theme.colors.library.orange[200],
  faint: theme.colors.library.gray[300],
};

const ShareMomentScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  
  const threadId = route.params?.threadId ?? "";
  const buddyName = route.params?.buddyName ?? "your buddy";
  const onCreated = route.params?.onCreated;

  const buddyFirstName = buddyName.split(" ")[0];

  const [selected, setSelected] = useState<MomentId | null>(null);
  const [posting, setPosting] = useState(false);
  const [crisisVisible, setCrisisVisible] = useState(false);
  const [acknowledgedCrisis, setAcknowledgedCrisis] = useState(false);

  const handleSelect = (id: MomentId) => {
    setSelected(id);
    track(ANALYTICS_EVENTS.MOMENT_SELECTED, { momentId: id, valence: getMoment(id).valence });
  };

  const doShare = async (momentId: MomentId) => {
    if (posting) return;
    const m = getMoment(momentId);
    try {
      setPosting(true);
      const signal = await createMomentSignal(threadId, { momentId });
      track(ANALYTICS_EVENTS.MOMENT_SHARED, {
        momentId,
        valence: m.valence,
        sensitive: !!m.sensitive,
      });
      onCreated?.(signal);
      navigation.goBack();
    } catch (e) {
      Alert.alert("Couldn't share", "Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const handleShare = () => {
    if (!selected || posting) return;
    const m = getMoment(selected);
    // Heavy disclosure → surface help first (once), but never block the share.
    if (m.sensitive && !acknowledgedCrisis) {
      setAcknowledgedCrisis(true);
      setCrisisVisible(true);
      track(ANALYTICS_EVENTS.MOMENT_CRISIS_PROMPT_SHOWN, { momentId: selected });
      return;
    }
    void doShare(selected);
  };

  // Dismiss without posting
  const handleDismiss = () => {
    track(ANALYTICS_EVENTS.MOMENT_CANCELLED, { hadSelection: !!selected });
    navigation.goBack();
  };

  const call988 = () => {
    track(ANALYTICS_EVENTS.MOMENT_CRISIS_RESOURCE_TAPPED, { resource: "988" });
    handleLinkPress("tel:988");
  };

  const openResources = () => {
    track(ANALYTICS_EVENTS.MOMENT_CRISIS_RESOURCE_TAPPED, { resource: "resources" });
    navigation.navigate("Resources");
  };

  const renderGroup = (label: string, valence: MomentValence) => {
    const items = momentsByValence(valence);

    return (
      <View style={styles.group}>
        <Text style={styles.groupLabel}>{label}</Text>
        <View style={styles.actionList}>
          {items.map((m) => {
            const isSel = selected === m.id;
            
            return (
              <PressableScale
                key={m.id}
                style={[styles.actionChip, isSel && styles.actionChipSelected]}
                scaleTo={0.96}
                onPress={() => handleSelect(m.id)}
                accessibilityLabel={`Share: ${m.text}`}
              >
                <Text style={styles.actionEmoji}>{m.emoji}</Text>
                <Text style={[styles.actionTitle, isSel && styles.actionTitleSelected]}>{m.text}</Text>
              </PressableScale>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <ScreenView style={styles.screen}>
      <BlurView
        intensity={80}
        tint="light"
        style={[
          styles.header,
          { paddingTop: insets.top + 10, height: 60 + insets.top },
        ]}
      >
        <PressableScale
          style={styles.backBtn}
          scaleTo={0.92}
          haptic={false}
          onPress={handleDismiss}
          hitSlop={12}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </PressableScale>
        <Text style={styles.screenHeaderTitle}>Share Moment</Text>
        <View style={{ width: 36 }} />
      </BlurView>

      <View style={[styles.container, { paddingTop: 60 + insets.top + 20 }]}>
        <Text style={styles.title}>Share a moment</Text>
        <Text style={styles.subtitle}>
          Let {buddyFirstName} know how it's really going — the hard ones count too.
        </Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {renderGroup("Wins", "win")}
          {renderGroup("Struggles", "struggle")}
        </ScrollView>
      </View>

      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom || 24 }]}>
        <View style={styles.footerRowWrap}>
          <PressableScale
            style={styles.footerRow}
            haptic={false}
            scaleTo={0.98}
            onPress={call988}
            accessibilityLabel="In crisis, call or text 988"
          >
            <MaterialCommunityIcons name="lifebuoy" size={15} color={C.orange700} />
            <Text style={styles.footerText}>In crisis? Call or text 988</Text>
          </PressableScale>
          <PressableScale haptic={false} scaleTo={0.98} onPress={openResources}>
            <Text style={styles.footerLink}>More resources</Text>
          </PressableScale>
        </View>

        <PressableScale
          style={[styles.shareBtnWrap, (!selected || posting) && styles.shareBtnDisabled]}
          scaleTo={0.97}
          disabled={!selected || posting}
          onPress={handleShare}
        >
          <View style={styles.shareBtn}>
            {posting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.shareBtnText}>Share with {buddyFirstName}</Text>
            )}
          </View>
        </PressableScale>
      </View>

      <PromptBottomSheet
        visible={crisisVisible}
        onClose={() => setCrisisVisible(false)}
        icon="lifebuoy"
        title="You don't have to go through this alone"
        message="If you're in crisis, help is available right now — free and confidential."
        primaryButton={{ label: "Call or text 988", onPress: call988 }}
        secondaryButton={{ label: "Share anyway", onPress: () => selected && doShare(selected) }}
      />
    </ScreenView>
  );
};

export default ShareMomentScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  screenHeaderTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading3),
    color: C.title,
    fontWeight: "800",
    fontSize: 24,
  },
  subtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: C.textMuted,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 22,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  group: { marginTop: 16 },
  groupLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: theme.colors.library.gray[400],
    textTransform: "uppercase",
    marginBottom: 12,
    marginLeft: 4,
  },
  actionList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  actionChipSelected: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  actionEmoji: { fontSize: 16 },
  actionTitle: { fontSize: 15, fontWeight: "600", color: "#334155" },
  actionTitleSelected: { color: "#FFFFFF" },

  stickyFooter: {
    paddingTop: 24,
    paddingHorizontal: 20,
    backgroundColor: "#FAFAFA",
    borderTopWidth: 1,
    borderTopColor: theme.colors.library.gray[100],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 4,
  },
  footerRowWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  footerText: { fontSize: 13, fontWeight: "700", color: C.orange700 },
  footerLink: { fontSize: 13, fontWeight: "700", color: C.faint },

  shareBtnWrap: {
    borderRadius: 100,
    ...parseShadowStyle(theme.shadow.elevation2),
    overflow: "hidden",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    backgroundColor: "#0F172A", // Pure minimalist dark slate
  },
  shareBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  shareBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
