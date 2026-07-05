import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useState, useRef, useEffect } from "react";
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";

import ScreenView from "../../components/ScreenView";
import {
  SchemeStatusBar,
  useTheme,
  spacing,
  space,
  Text,
  Icon,
  icons,
  PageHeader,
  TabDock,
  Button,
  TextLink,
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
  // Sensitive moments use a two-step sheet: care first, sharing is the second beat.
  const [sensitiveStep, setSensitiveStep] = useState<"support" | "share">("support");

  const scrollViewRef = useRef<ScrollView>(null);
  // A navigation action to run AFTER the confirm sheet has fully dismissed — the
  // Sheet is a native Modal, so navigating while it's open leaves it on top of
  // (or lingering over) the destination screen.
  const afterSheetClose = useRef<(() => void) | null>(null);

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
    setSensitiveStep("support"); // a sensitive sheet always opens on the care step
    setConfirmVisible(true);
    track(ANALYTICS_EVENTS.MOMENT_SELECTED, { momentId: id, valence: m.valence });
    if (m.sensitive) {
      track(ANALYTICS_EVENTS.MOMENT_CRISIS_PROMPT_SHOWN, { momentId: id });
    }
  };

  // Close the confirm sheet; optionally queue a navigation to run once it's gone.
  const dismissSheet = (then?: () => void) => {
    afterSheetClose.current = then ?? null;
    setConfirmVisible(false);
    setSelected(null); // drop the chip highlight; keep sheetMomentId for the slide-out
  };
  const closeConfirm = () => dismissSheet();
  const handleSheetDismissed = () => {
    const next = afterSheetClose.current;
    afterSheetClose.current = null;
    next?.();
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
      dismissSheet(() => navigation.goBack()); // close the sheet, THEN leave the composer
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
    dismissSheet(() => navigation.navigate("Resources")); // close the sheet, THEN navigate
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

  // ── The confirm sheet. The sheet wears the moment's full valence colour (gold win / blue
  //    struggle); the interior obeys ONE rule so content never reads as a control:
  //      • CONTENT is the only BORDERLESS thing — bare on-fill type + a bare glyph (no disc,
  //        no pill, no border), printed in the AA-correct on-fill ink.
  //      • ACTIONS are the only ENCLOSED shapes — a solid dark "island" (the one loud CTA) or
  //        a hairline outline pill. No ghost buttons: a borderless inked button would look
  //        exactly like content. So "has a boundary ⇒ tappable" holds end-to-end. ──
  const sheetMoment = sheetMomentId ? getMoment(sheetMomentId) : null;
  const isWin = sheetMoment?.valence === "win";
  const sheetFill = sheetMoment ? (isWin ? colors.gamification.gold : colors.accent.info) : undefined;
  // The AA-correct dark ink for the active fill (gold⇄accentOn.warning, blue⇄accentOn.info).
  const onFill = isWin ? colors.accentOn.warning : colors.accentOn.info;

  const renderConfirmContent = () => {
    if (!sheetMoment) return null;
    const isStruggle = sheetMoment.valence === "struggle";

    // Sensitive struggle → a two-step CARE-GATE so the sheet is never a wall of buttons:
    //   Step 1 (support): 988 is the one loud island; sharing is a quiet "when you're ready" link.
    //   Step 2 (share):   one Share island, with 988 re-anchored one tap away + a way back.
    // 988 stays an ENCLOSED button (never a mere link) on BOTH steps — crisis access stays obvious.
    if (sheetMoment.sensitive) {
      if (sensitiveStep === "support") {
        return (
          <Animated.View key="support" entering={FadeIn.duration(200)} style={styles.sheetBody}>
            {/* Content: bare lifeline glyph, care headline, the moment as a quiet quote. */}
            <Icon name="life-buoy" size={32} color={onFill} />
            <Text variant="h2" color={onFill} center>You don&apos;t have to carry this alone</Text>
            <Text variant="title" color={onFill} center numberOfLines={3}>{`“${sheetMoment.text}”`}</Text>
            <Text variant="bodySm" color={onFill} center>
              Support is here — free and confidential, 24/7.
            </Text>

            {/* Care actions only: 988 the single solid island, resources an outline pill. */}
            <View style={[styles.actionGroup, styles.actionGroupTop]}>
              <Button label="Call or text 988" variant="secondary" leftIcon="phone" onPress={call988} />
              <Button label="More resources" variant="outline" size="md" onColor={onFill} onPress={openResources} />
            </View>

            {/* Sharing is the second beat — a quiet, non-pushy invitation (a link, not a button). */}
            <TextLink
              label={`When you're ready, share with ${buddyFirstName}`}
              color={onFill}
              onPress={() => setSensitiveStep("share")}
            />
          </Animated.View>
        );
      }
      // Step 2 — share, with the lifeline still one tap away.
      return (
        <Animated.View key="share" entering={FadeIn.duration(200)} style={styles.sheetBody}>
          <Icon name={sheetMoment.icon} size={28} color={onFill} />
          <Text variant="h2" color={onFill} center>Share this with {buddyFirstName}?</Text>
          <Text variant="title" color={onFill} center numberOfLines={3}>{`“${sheetMoment.text}”`}</Text>
          <Text variant="bodySm" color={onFill} center>
            Sharing this lets {buddyFirstName} be there for you too.
          </Text>

          {/* One Share island; 988 stays a tap away as a still-here outline. */}
          <View style={[styles.actionGroup, styles.actionGroupTop]}>
            <Button label={`Share with ${buddyFirstName}`} variant="secondary" loading={posting} onPress={confirmShare} />
            <Button label="Still here — call or text 988" variant="outline" size="md" leftIcon="phone" onColor={onFill} onPress={call988} />
          </View>

          <TextLink label="← Back to support" color={onFill} onPress={() => setSensitiveStep("support")} />
        </Animated.View>
      );
    }

    // Win or mild struggle → the moment IS the headline; one solid island to share.
    // (Dismiss is the sheet's own swipe-down / tap-outside — no "Not now" button.)
    return (
      <View style={styles.sheetBody}>
        {/* Content: a bare valence glyph, a quiet eyebrow, the moment as the hero quote. */}
        <Icon name={sheetMoment.icon} size={28} color={onFill} />
        <Text variant="caption" color={onFill} center style={styles.eyebrow}>
          {isStruggle ? "HOW YOU'RE DOING" : "A WIN TO SHARE"}
        </Text>
        <Text variant="h1" color={onFill} center numberOfLines={3}>{`“${sheetMoment.text}”`}</Text>
        <Text variant="bodySm" color={onFill} center>
          {isStruggle
            ? `Showing up honestly is the brave part — ${buddyFirstName} can be there for you.`
            : `${buddyFirstName} will see this and can cheer you on.`}
        </Text>

        {/* One solid island to share (+ a quiet support outline for mild struggles). */}
        <View style={[styles.actionGroup, styles.actionGroupTop]}>
          <Button label={`Share with ${buddyFirstName}`} variant="secondary" loading={posting} onPress={confirmShare} />
          {isStruggle ? (
            <Button label="Need support? More resources" variant="outline" size="md" leftIcon="life-buoy" onColor={onFill} onPress={openResources} />
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <ScreenView style={[styles.screen, { backgroundColor: colors.background.canvas }]}>
      <SchemeStatusBar />
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
          { key: "win", label: "Wins", icon: icons.milestone },
          { key: "struggle", label: "Struggles", icon: icons.struggleTab },
        ]}
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k as "win" | "struggle")}
      />

      {/* Confirm-to-share sheet */}
      <Sheet
        visible={confirmVisible}
        onClose={closeConfirm}
        onDismissed={handleSheetDismissed}
        color={sheetFill}
      >
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

  // Confirm sheet — content is bare centred type; actions are enclosed pills.
  sheetBody: {
    alignItems: "center",
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  eyebrow: { letterSpacing: 1 },
  // A full-width column of action pills; the extra top gap separates them from content.
  actionGroup: {
    width: "100%",
    gap: spacing.sm,
  },
  actionGroupTop: {
    marginTop: spacing.sm,
  },
});
