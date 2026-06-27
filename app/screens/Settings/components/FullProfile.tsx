import React from "react";
import { Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import FAIcon from "react-native-vector-icons/FontAwesome5";
import { useUserStore } from "../../../stores/user";
import { LevelStage } from "../../../api/users";
import { showErrorBottomSheet } from "../../../util/functions/bottomSheet";
import { toSafeExternalUrl } from "../../../util/functions/url";
import {
  useTheme,
  spacing,
  radius,
  borderWidth,
  Text,
  Icon,
  IconName,
  Avatar,
  SectionHeader,
} from "../../../design-system";

interface FullProfileProps {
  levelStage?: LevelStage | null;
}

const FullProfile = ({ levelStage }: FullProfileProps) => {
  const { colors } = useTheme();
  const { user } = useUserStore();

  const openSocial = (url: string | undefined, name: string) => {
    const safe = toSafeExternalUrl(url);
    if (!safe) return showErrorBottomSheet(`Can't open ${name}`, "No valid link provided");
    Linking.openURL(safe).catch(console.error);
  };

  const field = (icon: IconName, label: string, value: string) => (
    <View style={styles.fieldRow}>
      <View style={styles.fieldIconWrapper}>
        <Icon name={icon} size={16} color={colors.text.tertiary} />
      </View>
      <View style={styles.fieldContent}>
        <Text variant="caption" color="tertiary" style={styles.fieldLabel}>
          {label}
        </Text>
        <Text variant="body">{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Identity card — clean flat fill, no outline, no elevation */}
      <View
        style={[
          styles.profileSection,
          { backgroundColor: colors.surface.elevated },
        ]}
      >
        <View style={styles.profileInfo}>
          <View style={styles.profileImageWrapper}>
            <Avatar image={user?.profilePictureUrl} shape="rounded" size={80} />
            <View style={[styles.levelBadge, { backgroundColor: colors.action.primary, borderColor: colors.surface.elevated }]}>
              <Text variant="caption" color={colors.action.onPrimary}>
                {levelStage?.level || user?.level || 1}
              </Text>
            </View>
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
              <View style={[styles.levelTitle, { backgroundColor: colors.action.primary + "1F" }]}>
                <Text variant="caption" color={colors.action.primary}>
                  {levelStage.fullTitle}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.infoContainer}>
        {/* Personal Info */}
        <View style={[styles.cardContainer, { backgroundColor: colors.surface.default }]}>
          <SectionHeader icon="user" title="Personal Information" />
          <View style={styles.fieldGroup}>
            {field("mail", "Email", user?.email || "-")}
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
                <FAIcon name="facebook-f" size={20} color={colors.text.primary} />
              </View>
              <Text variant="caption" color="secondary">Facebook</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialItem} onPress={() => openSocial(user?.links?.social.instagram, "Instagram")}>
              <View style={[styles.socialIcon, { backgroundColor: colors.surface.control }]}>
                <FAIcon name="instagram" size={20} color={colors.text.primary} />
              </View>
              <Text variant="caption" color="secondary">Instagram</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialItem} onPress={() => openSocial(user?.links?.social.whatsapp, "Whatsapp")}>
              <View style={[styles.socialIcon, { backgroundColor: colors.surface.control }]}>
                <FAIcon name="whatsapp" size={20} color={colors.text.primary} />
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
  profileSection: {
    borderRadius: radius.card,
    paddingVertical: spacing.xl,
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  profileImageWrapper: {
    position: "relative",
    width: 80,
    height: 80,
  },
  levelBadge: {
    position: "absolute",
    top: -4,
    left: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
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
    alignItems: "center",
    gap: spacing.lg,
  },
  fieldIconWrapper: {
    width: 32,
    alignItems: "center",
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    marginBottom: spacing.xxs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
