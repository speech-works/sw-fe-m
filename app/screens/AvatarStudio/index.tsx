import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Directions, Gesture, GestureDetector } from "react-native-gesture-handler";
import { updateMyUser } from "../../api/users";
import { useUserStore } from "../../stores/user";
import { useAvatarDraftStore } from "../../stores/avatarDraft";
import { stageIndexForLevel } from "../../types/avatar";
import {
  BG_COLORS,
  HAIR_COLORS,
  SKIN_TONES,
  STAGE_NAMES,
} from "../../assets/avatar/registry";
import { UserAvatar } from "../../components/UserAvatar";
import {
  Page,
  Button,
  TabDock,
  Text,
  Toast,
  Dialog,
  useTheme,
  spacing,
  space,
  icons,
} from "../../design-system";
import { SwatchGrid } from "./components/SwatchGrid";
import { PartGrid } from "./components/PartGrid";

type SlotTab =
  | "skin"
  | "face"
  | "hair"
  | "beard"
  | "headgear"
  | "eyewear"
  | "collar"
  | "prop"
  | "backdrop";

const SLOT_TABS: { key: SlotTab; label: string; icon: string }[] = [
  { key: "skin", label: "Skin", icon: icons.avatarSkin },
  { key: "face", label: "Expression", icon: icons.avatarFace },
  { key: "hair", label: "Hair", icon: icons.avatarHair },
  { key: "beard", label: "Beard", icon: icons.avatarBeard },
  { key: "headgear", label: "Headgear", icon: icons.avatarHeadgear },
  { key: "eyewear", label: "Eyewear", icon: icons.avatarEyewear },
  { key: "collar", label: "Collar", icon: icons.avatarCollar },
  { key: "prop", label: "Prop", icon: icons.avatarProp },
  { key: "backdrop", label: "Backdrop", icon: icons.avatarBackdrop },
];

const TOAST_MS = 2600;

/**
 * The Avatar Studio — where the user builds the character they own. Free
 * choices (skin/hair/wardrobe) are the IKEA labor; journey gear appears in the
 * same rows, locked until its stage is reached, because the locked hat IS the
 * level-up pitch. Saving writes the manifest to the user (PATCH /users/me);
 * the draft survives an app kill and is never lost on a failed save.
 */
const AvatarStudio = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user, setUser } = useUserStore();
  const { draft, loadFromUser, setPart, setColor, isDirty, clear } =
    useAvatarDraftStore();

  const [tab, setTab] = useState<SlotTab>("skin");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; icon?: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The pending navigation action captured by the unsaved-changes guard — its
  // presence drives the DS confirm Dialog (no native Alert).
  const [pendingLeave, setPendingLeave] = useState<unknown>(null);

  const stage = stageIndexForLevel(user?.level ?? 1);

  useEffect(() => {
    loadFromUser(user?.avatarManifest);
    // Intentionally once on mount: mid-session user refetches must not clobber
    // the in-progress draft (loadFromUser also self-guards when dirty).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  // Unsaved-changes guard — navigation events, not exit-button bookkeeping.
  // Preventing the leave and stashing the action lets the DS confirm Dialog
  // decide; discarding resets the draft (→ not dirty) and re-dispatches, which
  // the guard then waves through.
  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e: any) => {
      if (!useAvatarDraftStore.getState().isDirty() || saving) return;
      e.preventDefault();
      setPendingLeave(e.data.action);
    });
    return unsub;
  }, [navigation, saving]);

  const confirmDiscard = () => {
    const action = pendingLeave;
    setPendingLeave(null);
    useAvatarDraftStore.getState().reset();
    if (action) navigation.dispatch(action as any);
  };

  // Horizontal fling on the panel pages between slots (next/prev), so the whole
  // content area is swipeable — not just the dock. Functional setState reads the
  // latest tab; clamps at the ends. A fling coexists with the vertical scroll
  // and taps (it's a distinct flick), matching the app's lens-swipe convention.
  const goTab = (dir: 1 | -1) =>
    setTab((cur) => {
      const idx = SLOT_TABS.findIndex((t) => t.key === cur);
      const next = Math.min(SLOT_TABS.length - 1, Math.max(0, idx + dir));
      return SLOT_TABS[next].key;
    });

  const tabSwipe = Gesture.Race(
    Gesture.Fling().direction(Directions.LEFT).numberOfPointers(1).runOnJS(true).onEnd(() => goTab(1)),
    Gesture.Fling().direction(Directions.RIGHT).numberOfPointers(1).runOnJS(true).onEnd(() => goTab(-1)),
  );

  const showToast = (message: string, icon?: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, icon });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  };

  const handleSave = async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const saved = await updateMyUser({ avatarManifest: draft });
      setUser(saved);
      clear();
      showToast("Avatar saved");
      navigation.goBack();
    } catch (error) {
      console.error("Avatar save failed:", error);
      // The draft is persisted — the user's labor survives the failure.
      showToast("Couldn't save — your changes are kept", icons.warning);
    } finally {
      setSaving(false);
    }
  };

  if (!draft) return null; // one frame while the store hydrates

  return (
    <>
      <Page
        title="Your Avatar"
        description={`${STAGE_NAMES[stage]} gear unlocked so far — practice to earn the rest.`}
        onBack={() => navigation.goBack()}
        footer={
          <Button
            label={saving ? "Saving…" : "Save"}
            onPress={handleSave}
            disabled={!isDirty() || saving}
          />
        }
      >
        {/* The mirror: the draft, live. */}
        <View style={styles.preview}>
          <UserAvatar manifest={draft} size={220} animate />
        </View>

        <View style={styles.dock}>
          <TabDock
            inline
            fitContent
            scrollable
            accessibilityLabel="Avatar slots"
            items={SLOT_TABS.map((t) => ({ key: t.key, label: t.label, icon: t.icon as any }))}
            activeKey={tab}
            onSelect={(k) => setTab(k as SlotTab)}
          />
        </View>

        <GestureDetector gesture={tabSwipe}>
        <View style={styles.panel}>
          {tab === "skin" && (
            <SwatchGrid
              swatches={SKIN_TONES}
              selectedHex={draft.colors.skin}
              onSelect={(hex) => setColor("skin", hex)}
            />
          )}

          {tab === "face" && (
            <PartGrid
              slot="face"
              ids={["face.brand", "face.smile", "face.joy", "face.wink", "face.wow"]}
              draft={draft}
              stage={stage}
              onSelect={(id) => setPart("face", id)}
            />
          )}

          {tab === "hair" && (
            <>
              {/* Colour first (it's shown on top), then the styles below. */}
              <Text variant="label" color="tertiary" style={styles.subLabel}>
                Colour
              </Text>
              <SwatchGrid
                swatches={HAIR_COLORS}
                selectedHex={draft.colors.hair}
                onSelect={(hex) => setColor("hair", hex)}
              />
              <Text variant="label" color="tertiary" style={styles.subLabel}>
                Style
              </Text>
              <PartGrid
                slot="hair"
                ids={["hair.crop", "hair.swoop", "hair.curls", "hair.waves", "hair.long"]}
                draft={draft}
                stage={stage}
                onSelect={(id) => setPart("hair", id)}
                allowNone
              />
            </>
          )}

          {tab === "beard" && (
            <PartGrid
              slot="beard"
              ids={[
                "beard.stubble",
                "beard.mustache",
                "beard.handlebar",
                "beard.horseshoe",
                "beard.walrus",
                "beard.goatee",
                "beard.full",
              ]}
              draft={draft}
              stage={stage}
              onSelect={(id) => setPart("beard", id)}
              allowNone
            />
          )}

          {tab === "headgear" && (
            <PartGrid
              slot="headgear"
              ids={[
                "headgear.beanie",
                "headgear.cap",
                "headgear.headphones",
                "headgear.tourist",
                "headgear.explorer",
                "headgear.cowboy",
                "headgear.party",
                "headgear.crown",
                "headgear.tophat",
              ]}
              draft={draft}
              stage={stage}
              onSelect={(id) => setPart("headgear", id)}
              allowNone
            />
          )}

          {tab === "eyewear" && (
            <PartGrid
              slot="eyewear"
              ids={[
                "eyewear.round",
                "eyewear.square",
                "eyewear.wayfarer",
                "eyewear.roundshades",
                "eyewear.lime",
                "eyewear.aviator",
                "eyewear.heart",
                "eyewear.star",
                "eyewear.cateye",
              ]}
              draft={draft}
              stage={stage}
              onSelect={(id) => setPart("eyewear", id)}
              allowNone
            />
          )}

          {tab === "collar" && (
            <PartGrid
              slot="collar"
              ids={["collar.scarf", "collar.bowtie", "collar.cowl"]}
              draft={draft}
              stage={stage}
              onSelect={(id) => setPart("collar", id)}
              allowNone
            />
          )}

          {tab === "prop" && (
            <PartGrid
              slot="prop"
              ids={[
                "prop.mic",
                "prop.book",
                "prop.camera",
                "prop.compass",
                "prop.lantern",
                "prop.flag",
              ]}
              draft={draft}
              stage={stage}
              onSelect={(id) => setPart("prop", id)}
              allowNone
            />
          )}

          {tab === "backdrop" && (
            <SwatchGrid
              swatches={BG_COLORS}
              selectedHex={draft.colors.bg}
              onSelect={(hex) => setColor("bg", hex)}
            />
          )}
        </View>
        </GestureDetector>
      </Page>

      {/* Inline result toast (EditProfile precedent — never the global modal). */}
      {toast ? (
        <View style={styles.toastWrap} pointerEvents="none">
          <Toast
            message={toast.message}
            icon={(toast.icon as any) ?? undefined}
            iconColor={toast.icon ? colors.feedback.warningText : undefined}
          />
        </View>
      ) : null}

      {/* Unsaved-changes confirm — the DS Dialog, not a native Alert. Closing
          (backdrop / "Keep editing") is the safe default; "Discard" leaves. */}
      <Dialog
        visible={pendingLeave != null}
        onClose={() => setPendingLeave(null)}
        title="Keep editing?"
        message="Your avatar has unsaved changes."
        confirmLabel="Discard"
        destructive
        onConfirm={confirmDiscard}
        cancelLabel="Keep editing"
      />
    </>
  );
};

export default AvatarStudio;

const styles = StyleSheet.create({
  preview: {
    alignItems: "center",
    marginTop: spacing.lg,
  },
  dock: {
    marginTop: space.sectionGap,
    // This dock alone bleeds past the Page's screenX gutter so the scrollable
    // tabs run edge-to-edge — the scroll clips at the true screen edge instead
    // of looking cut by the page padding. The half-viewport content padding
    // inside TabDock still keeps the selected tab centered on screen.
    marginHorizontal: -space.screenX,
  },
  panel: {
    marginTop: space.groupGap,
    marginBottom: space.sectionGap,
  },
  subLabel: {
    marginTop: space.sectionGap,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  toastWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 120, // floats above the pinned Save footer
    alignItems: "center",
  },
});
