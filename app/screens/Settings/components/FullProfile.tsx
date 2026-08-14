import React, { useEffect, useRef, useState } from "react";
import { Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import { useUserStore } from "../../../stores/user";
import { LevelStage } from "../../../api/users";
import { showErrorBottomSheet } from "../../../util/functions/bottomSheet";
import { toSafeExternalUrl } from "../../../util/functions/url";
import { withWrapPoints } from "../../../util/functions/strings";
import { copyToClipboard } from "../../../util/functions/clipboard";
import PressableScale from "../../../components/PressableScale";
import {
  size,
  useTheme,
  spacing,
  radius,
  borderWidth,
  Text,
  Icon,
  icons,
  IconName,
  SectionHeader,
} from "../../../design-system";
import { AvatarButton } from "../../../components/AvatarButton";

interface FullProfileProps {
  levelStage?: LevelStage | null;
  /** Tapping the avatar opens the avatar studio (the sheet closes first). */
  onEditAvatar: () => void;
}

/** How long the row stays in its "Copied" state before returning to normal. */
const COPIED_MS = 1600;

const FullProfile = ({ levelStage, onEditAvatar }: FullProfileProps) => {
  const { colors } = useTheme();
  const { user } = useUserStore();
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const openSocial = (url: string | undefined, name: string) => {
    const safe = toSafeExternalUrl(url);
    if (!safe) return showErrorBottomSheet(`Can't open ${name}`, "No valid link provided");
    Linking.openURL(safe).catch(console.error);
  };

  /**
   * Confirmation stays INSIDE the row, deliberately.
   *
   * The obvious move is `showSuccessBottomSheet`, and it would freeze the app:
   * this screen lives in a `Sheet`, which is a native Modal, and stacking a
   * second one over it kills touch handling app-wide on iOS. A label swap plus
   * the icon morph says the same thing where the person is already looking,
   * and costs nothing.
   */
  const copyEmail = async () => {
    if (!user?.email) return;
    // Confirm only what actually happened: if the platform refuses the write,
    // the row says nothing rather than claiming a copy that is not there.
    const ok = await copyToClipboard(user.email);
    if (!ok) return;
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  const field = (
    icon: IconName,
    label: string,
    value: string,
    copy?: { onPress: () => void; done: boolean; label: string },
  ) => {
    const done = copy?.done ?? false;
    const body = (
      <View style={styles.fieldRow}>
        <View style={styles.fieldIconWrapper}>
          <Icon name={icon} size={size.iconSm} color={colors.text.tertiary} />
        </View>
        <View style={styles.fieldContent}>
          <Text
            variant="eyebrow"
            color={done ? "accent" : "tertiary"}
            style={styles.fieldLabel}
          >
            {/* Lower case in source: the `eyebrow` variant owns the casing. */}
            {done ? "Copied" : label}
          </Text>
          {/* Wrapped at its seams, never truncated: this card exists to show the
              value in full, so an ellipsis would defeat the row. */}
          <Text variant="body">{withWrapPoints(value)}</Text>
        </View>
        {copy ? (
          // Not `fieldIconWrapper`: the leading column is 32 wide, and a second
          // one of those would take 48pt off the value's line, which is the
          // scarce thing on this row.
          <View style={styles.fieldAction}>
            <Icon
              name={done ? icons.success : icons.copy}
              size={size.iconSm}
              color={done ? colors.text.accent : colors.text.tertiary}
            />
          </View>
        ) : null}
      </View>
    );

    if (!copy) return body;
    return (
      <PressableScale
        // A whole row is a big thing to shrink; 0.99 reads as a press without
        // the card appearing to flex.
        scaleTo={0.99}
        onPress={copy.onPress}
        accessibilityRole="button"
        accessibilityLabel={copy.label}
      >
        {body}
      </PressableScale>
    );
  };

  return (
    <View style={styles.root}>
      {/* Identity header — free-floating on the sheet, no card wrapper */}
      <View style={styles.profileInfo}>
        <View style={{ paddingTop: 6, paddingLeft: 6, marginRight: -6 }}>
          <AvatarButton
            size={80}
            level={levelStage?.level || user?.level || 1}
            onPress={onEditAvatar}
          />
        </View>
        <View style={styles.profileDetails}>
          <Text variant="h3">{user?.name}</Text>
          <Text variant="bodySm" color="secondary">
            Member since{" "}
            {user?.createdAt
              ? new Date(user.createdAt).getFullYear()
              : new Date().getFullYear()}
          </Text>
          {levelStage ? (
            <View style={[styles.levelTitle, { backgroundColor: colors.action.primaryTint }]}>
              <Text variant="caption" color="accent">
                {levelStage.fullTitle}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.infoContainer}>
        {/* Personal Info */}
        <View style={[styles.cardContainer, { backgroundColor: colors.surface.default }]}>
          <SectionHeader icon="user" title="Personal Information" />
          <View style={styles.fieldGroup}>
            {/* Copy is offered only when there is something to copy: a "-"
                placeholder with a tap target on it is a promise the row
                cannot keep. */}
            {field(
              "mail",
              "Email",
              user?.email || "-",
              user?.email
                ? {
                    onPress: () => void copyEmail(),
                    done: copied,
                    label: "Copy email address",
                  }
                : undefined,
            )}
            <View style={[styles.separator, { backgroundColor: colors.border.hairline }]} />
            {field("smartphone", "Phone", user?.phoneNumber || "-")}
            <View style={[styles.separator, { backgroundColor: colors.border.hairline }]} />
            {field(
              "calendar",
              "Date of Birth",
              user?.dob ? new Date(user.dob).toLocaleDateString("en-GB") : "-",
            )}
          </View>
        </View>

        {/* About Me */}
        <View style={[styles.cardContainer, { backgroundColor: colors.surface.default }]}>
          <SectionHeader icon="info" title="About Me" />
          <Text variant="body" color="secondary">
            {user?.bio || "No bio added yet."}
          </Text>
        </View>

        {/* Social Links */}
        <View style={[styles.cardContainer, { backgroundColor: colors.surface.default }]}>
          <SectionHeader icon="share-2" title="Social Links" />
          <View style={styles.socialGrid}>
            <TouchableOpacity style={styles.socialItem} onPress={() => openSocial(user?.links?.social.facebook, "Facebook")}>
              <View style={[styles.socialIcon, { backgroundColor: colors.surface.control }]}>
                <Icon name={icons.socialFacebook} size={size.icon} color={colors.text.primary} />
              </View>
              <Text variant="caption" color="secondary">Facebook</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialItem} onPress={() => openSocial(user?.links?.social.instagram, "Instagram")}>
              <View style={[styles.socialIcon, { backgroundColor: colors.surface.control }]}>
                <Icon name={icons.socialInstagram} size={size.icon} color={colors.text.primary} />
              </View>
              <Text variant="caption" color="secondary">Instagram</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialItem} onPress={() => openSocial(user?.links?.social.whatsapp, "Whatsapp")}>
              <View style={[styles.socialIcon, { backgroundColor: colors.surface.control }]}>
                <Icon name={icons.socialWhatsapp} size={size.icon} color={colors.text.primary} />
              </View>
              <Text variant="caption" color="secondary">Whatsapp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

export default FullProfile;

const styles = StyleSheet.create({
  root: {
    width: "100%",
    gap: spacing.xl,
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
  },
  profileDetails: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.xxs,
  },
  levelTitle: {
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
  infoContainer: {
    gap: spacing.lg,
  },
  cardContainer: {
    borderRadius: radius.card,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.lg,
  },
  fieldRow: {
    flexDirection: "row",
    // Anchored to the FIRST LINE, not centred on the block.
    //
    // Centring makes the icon's position depend on how tall its value happens
    // to be, so a two-line email dropped the envelope well below where the
    // phone and calendar glyphs sit and the icon column stopped being a
    // column. Anchoring every row the same way keeps that edge straight
    // whatever the content does. `eyebrow` is 16pt of line box and the glyph
    // is 16pt, so they centre on each other with no nudge.
    alignItems: "flex-start",
    gap: spacing.lg,
  },
  fieldIconWrapper: {
    width: 32,
    alignItems: "center",
  },
  fieldAction: {
    width: size.iconSm,
    alignItems: "center",
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    marginBottom: spacing.xxs,
  },
  separator: {
    height: borderWidth.hairline,
    marginLeft: 48,
  },
  socialGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  socialItem: {
    alignItems: "center",
    gap: spacing.sm,
  },
  socialIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
