import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useState, useRef, useEffect } from "react";
import {
  Alert,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScreenView from "../../components/ScreenView";
import PressableScale from "../../components/PressableScale";
import {
  useTheme,
  spacing,
  radius,
  fonts,
  space,
  Text,
  Icon,
  IconName,
  PageHeader,
  TabDock,
  Button,
  Sheet,
  ConnectedAvatarRow,
} from "../../design-system";
import { createMomentSignal, MomentId, MomentValence } from "../../api/threads";
import { getMoment, momentsByValence } from "../../constants/momentMessages";
import { handleLinkPress } from "../../util/functions/externalLinks";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";

const screenWidth = Dimensions.get("window").width;

const ShareMomentScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const threadId = route.params?.threadId ?? "";
  const buddyName = route.params?.buddyName ?? "your buddy";
  const onCreated = route.params?.onCreated;

  const buddyFirstName = buddyName.split(" ")[0];

  const [selected, setSelected] = useState<MomentId | null>(null); // chip highlight
  const [sheetMomentId, setSheetMomentId] = useState<MomentId | null>(null); // sheet content (persists through close anim)
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"win" | "struggle">("win");
  const [posting, setPosting] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: activeTab === "win" ? 0 : screenWidth,
        animated: true,
      });
    }
  }, [activeTab]);

  // Selecting a moment opens the confirm sheet (there is no separate Share button).
  const handleSelect = (id: MomentId) => {
    const m = getMoment(id);
    setSelected(id);
    setSheetMomentId(id);
    setConfirmVisible(true);
    track(ANALYTICS_EVENTS.MOMENT_SELECTED, { momentId: id, valence: m.valence });
    if (m.sensitive) {
      track(ANALYTICS_EVENTS.MOMENT_CRISIS_PROMPT_SHOWN, { momentId: id });
    }
  };

  const closeConfirm = () => {
    setConfirmVisible(false);
    setSelected(null); // drop the chip highlight; keep sheetMomentId for the slide-out
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

  const confirmShare = () => {
    if (sheetMomentId) void doShare(sheetMomentId);
  };

  // Leave the composer entirely (header back).
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

  const renderGroup = (valence: MomentValence) => {
    const items = momentsByValence(valence);
    // Warm disc for wins (gold), cool disc for struggles (blue) — the icon stays
    // dark (text.onInverse), which clears AA on both fills.
    const avatarColor = valence === "win" ? colors.gamification.gold : colors.accent.info;
    return (
      <View style={styles.actionList}>
        {items.map((m) => (
          <ConnectedAvatarRow
            key={m.id}
            icon={m.icon}
            title={m.text}
            avatarColor={avatarColor}
            selected={selected === m.id}
            onPress={() => handleSelect(m.id)}
          />
        ))}
      </View>
    );
  };

  // ── The confirm sheet — simple for wins/mild struggles, support-first for sensitive ones. ──
  const sheetMoment = sheetMomentId ? getMoment(sheetMomentId) : null;

  const renderPreview = (icon: IconName, text: string) => (
    <View style={[styles.previewCard, { backgroundColor: colors.surface.control }]}>
      <Icon name={icon} size={18} color={colors.text.primary} />
      <Text variant="bodySm" color="primary" style={styles.bold}>{text}</Text>
    </View>
  );

  const renderConfirmContent = () => {
    if (!sheetMoment) return null;
    const isStruggle = sheetMoment.valence === "struggle";

    // Sensitive struggle → lead with care, then help (988), then the share.
    if (sheetMoment.sensitive) {
      return (
        <View style={styles.sheetBody}>
          <View style={[styles.sheetIcon, { backgroundColor: colors.action.primaryTint }]}>
            <MaterialCommunityIcons name="lifebuoy" size={28} color={colors.action.primary} />
          </View>
          <Text variant="h2" style={styles.sheetCenter}>You don't have to carry this alone</Text>
          {renderPreview(sheetMoment.icon, sheetMoment.text)}

          {/* Help, surfaced first */}
          <View style={[styles.supportPanel, { backgroundColor: colors.surface.default, borderColor: colors.border.default }]}>
            <Text variant="bodySm" color="secondary" style={styles.sheetCenter}>
              If things feel heavy right now, support is here — free and confidential, 24/7.
            </Text>
            <Button label="Call or text 988" variant="primary" onPress={call988} />
            <PressableScale haptic={false} scaleTo={0.98} onPress={openResources} style={styles.linkBtn}>
              <Text variant="caption" color="tertiary" style={styles.bold}>More resources</Text>
            </PressableScale>
          </View>

          {/* Then the share — framed as letting the buddy show up, not a transaction */}
          <Text variant="bodySm" color="secondary" style={styles.sheetCenter}>
            When you're ready, sharing this lets {buddyFirstName} be there for you too.
          </Text>
          <View style={styles.sheetActions}>
            <Button label={`Share with ${buddyFirstName}`} variant="secondary" loading={posting} onPress={confirmShare} />
            <Button label="Not now" variant="ghost" onPress={closeConfirm} />
          </View>
        </View>
      );
    }

    // Win or mild struggle → a warm, simple confirm.
    return (
      <View style={styles.sheetBody}>
        <Text variant="h2" style={styles.sheetCenter}>
          {isStruggle ? "Share how you're doing?" : "Share your win?"}
        </Text>
        {renderPreview(sheetMoment.icon, sheetMoment.text)}
        <Text variant="bodySm" color="secondary" style={styles.sheetCenter}>
          {isStruggle
            ? `Showing up honestly is the brave part — ${buddyFirstName} will see this and can be there for you.`
            : `${buddyFirstName} will see this and can cheer you on.`}
        </Text>
        <View style={styles.sheetActions}>
          <Button label={`Share with ${buddyFirstName}`} variant="primary" loading={posting} onPress={confirmShare} />
          <Button label="Not now" variant="ghost" onPress={closeConfirm} />
        </View>
        {isStruggle ? (
          <PressableScale haptic={false} scaleTo={0.98} onPress={openResources} style={styles.linkBtn}>
            <Text variant="caption" color="tertiary" style={styles.bold}>Need support? More resources</Text>
          </PressableScale>
        ) : null}
      </View>
    );
  };

  return (
    <ScreenView style={[styles.screen, { backgroundColor: colors.background.canvas }]}>
      <StatusBar barStyle="light-content" />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.background.canvas }]} />

      {/* Canonical header (shared with every page) */}
      <PageHeader
        title="Share a moment"
        description={`Let ${buddyFirstName} know how it's really going — the hard ones count too.`}
        onBack={handleDismiss}
        standalone
      />

      {/* Chips — horizontal pager (Wins / Struggles), each vertically scrollable */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const offsetX = e.nativeEvent.contentOffset.x;
          const pageIndex = Math.round(offsetX / screenWidth);
          setActiveTab(pageIndex === 0 ? "win" : "struggle");
        }}
        style={styles.pager}
      >
        <ScrollView
          style={{ width: screenWidth }}
          contentContainerStyle={styles.pageContent}
          showsVerticalScrollIndicator={false}
        >
          {renderGroup("win")}
        </ScrollView>
        <ScrollView
          style={{ width: screenWidth }}
          contentContainerStyle={styles.pageContent}
          showsVerticalScrollIndicator={false}
        >
          {renderGroup("struggle")}
        </ScrollView>
      </ScrollView>

      {/* Opaque status-bar cap */}
      {insets.top > 0 ? (
        <View
          style={[styles.statusCap, { height: insets.top, backgroundColor: colors.background.canvas }]}
          pointerEvents="none"
        />
      ) : null}

      {/* Internal menu dock — Wins / Struggles, floating at the bottom (same as Progress Report) */}
      <TabDock
        fitContent
        accessibilityLabel="Moment type"
        items={[
          { key: "win", label: "Wins", icon: "trophy-variant-outline" },
          { key: "struggle", label: "Struggles", icon: "cloud-outline" },
        ]}
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k as "win" | "struggle")}
      />

      {/* Confirm-to-share sheet */}
      <Sheet visible={confirmVisible} onClose={closeConfirm}>
        {renderConfirmContent()}
      </Sheet>
    </ScreenView>
  );
};

export default ShareMomentScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 0,
  },
  bold: { fontFamily: fonts.bold },
  statusCap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  pager: { flex: 1 },
  pageContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: space.sectionGap,
    paddingBottom: 130, // clears the floating dock
  },
  actionList: {
    gap: spacing.lg,
  },

  // Confirm sheet
  sheetBody: {
    alignItems: "center",
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  sheetIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCenter: { textAlign: "center" },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    alignSelf: "center",
  },
  supportPanel: {
    width: "100%",
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: "center",
  },
  sheetActions: {
    width: "100%",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  linkBtn: {
    alignSelf: "center",
    paddingVertical: spacing.sm,
  },
});
