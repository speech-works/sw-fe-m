import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
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
  useTheme,
  spacing,
  space,
  icons,
} from "../../design-system";
import { SwatchGrid } from "./components/SwatchGrid";
import { PartGrid } from "./components/PartGrid";

type SlotTab = "skin" | "hair" | "headgear" | "eyewear" | "prop" | "backdrop";

const SLOT_TABS: { key: SlotTab; label: string; icon: string }[] = [
  { key: "skin", label: "Skin", icon: icons.avatarSkin },
  { key: "hair", label: "Hair", icon: icons.avatarHair },
  { key: "headgear", label: "Headgear", icon: icons.avatarHeadgear },
  { key: "eyewear", label: "Eyewear", icon: icons.avatarEyewear },
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
  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e: any) => {
      if (!useAvatarDraftStore.getState().isDirty() || saving) return;
      e.preventDefault();
      Alert.alert(
        "Keep editing?",
        "Your avatar has unsaved changes.",
        [
          { text: "Keep editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              useAvatarDraftStore.getState().reset();
              navigation.dispatch(e.data.action);
            },
          },
        ],
      );
    });
    return unsub;
  }, [navigation, saving]);

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
            accessibilityLabel="Avatar slots"
            items={SLOT_TABS.map((t) => ({ key: t.key, label: t.label, icon: t.icon as any }))}
            activeKey={tab}
            onSelect={(k) => setTab(k as SlotTab)}
          />
        </View>

        <View style={styles.panel}>
          {tab === "skin" && (
            <SwatchGrid
              swatches={SKIN_TONES}
              selectedHex={draft.colors.skin}
              onSelect={(hex) => setColor("skin", hex)}
            />
          )}

          {tab === "hair" && (
            <>
              <PartGrid
                slot="hair"
                ids={["hair.crop", "hair.swoop", "hair.curls", "hair.waves"]}
                draft={draft}
                stage={stage}
                onSelect={(id) => setPart("hair", id)}
                allowNone
              />
              <Text variant="label" color="tertiary" style={styles.subLabel}>
                Hair color
              </Text>
              <SwatchGrid
                swatches={HAIR_COLORS}
                selectedHex={draft.colors.hair}
                onSelect={(hex) => setColor("hair", hex)}
              />
            </>
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
                "headgear.explorer-star",
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
              ids={["eyewear.round", "eyewear.square", "eyewear.aviator"]}
              draft={draft}
              stage={stage}
              onSelect={(id) => setPart("eyewear", id)}
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
    alignItems: "center",
    marginTop: space.sectionGap,
  },
  panel: {
    marginTop: space.groupGap,
    marginBottom: space.sectionGap,
  },
  subLabel: {
    marginTop: space.sectionGap,
    marginBottom: spacing.sm,
  },
  toastWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 120, // floats above the pinned Save footer
    alignItems: "center",
  },
});
