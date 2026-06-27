import React from "react";
import { Image, Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import FAIcon from "react-native-vector-icons/FontAwesome5";
import { useUserStore } from "../../../stores/user";
import { LevelStage } from "../../../api/users";
import { showErrorBottomSheet } from "../../../util/functions/bottomSheet";
import { toSafeExternalUrl } from "../../../util/functions/url";
import EditProfile from "./EditProfile";
import EditProfileFace from "../../../assets/sw-faces/EditProfileFace";
import {
  useTheme,
  spacing,
  radius,
  borderWidth,
  elevation,
  Text,
  Icon,
  IconName,
} from "../../../design-system";

interface FullProfileProps {
  levelStage?: LevelStage | null;
}

const SectionHeader = ({ icon, title }: { icon: IconName; title: string }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.iconContainer, { backgroundColor: colors.surface.control }]}>
        <Icon name={icon} size={16} color={colors.text.primary} />
      </View>
      <Text variant="title">{title}</Text>
    </View>
  );
};

const FullProfile = ({ levelStage }: FullProfileProps) => {
  const { colors } = useTheme();
  const { user } = useUserStore();
  const [mode, setMode] = React.useState<"view" | "edit">("view");
  const onProfileEdit = () => {
    setMode("edit");
  };
  const onProfileSave = () => {
    setMode("view");
  };

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

  if (mode === "edit") {
    return <EditProfile onSave={onProfileSave} />;
  }

  return (
    <View style={styles.root}>
      <Text variant="h3" center style={styles.headerText}>
        My Profile
      </Text>

      {/* Identity card — dark + orange accents */}
      <View
        style={[
          styles.profileSection,
          { backgroundColor: colors.surface.elevated, borderColor: colors.border.default },
          elevation.e2,
        ]}
      >
        <View style={styles.profileInfo}>
          <View style={styles.profileImageWrapper}>
            <Image
              source={{ uri: user?.profilePictureUrl }}
              style={[styles.profileImage, { borderColor: colors.action.primary }]}
            />
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
          <TouchableOpacity
            onPress={onProfileEdit}
            style={[styles.editButton, { backgroundColor: colors.action.primary }]}
          >
            <Icon name="edit-2" size={12} color={colors.action.onPrimary} />
            <Text variant="label" color={colors.action.onPrimary}>
              Edit
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardFaceContainer}>
          <EditProfileFace size={96} transparentBg />
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
  headerText: {
    marginBottom: spacing.xs,
  },
  profileSection: {
    borderRadius: radius.card,
    borderWidth: borderWidth.thin,
    paddingTop: spacing["2xl"],
    paddingBottom: spacing.xl,
    overflow: "hidden",
    position: "relative",
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    zIndex: 1,
  },
  profileImageWrapper: {
    position: "relative",
    width: 80,
    height: 80,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
  },
  levelBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
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
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  infoContainer: {
    gap: spacing.lg,
  },
  cardContainer: {
    borderRadius: radius.card,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
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
  cardFaceContainer: {
    position: "absolute",
    right: -15,
    bottom: -15,
    zIndex: 0,
    opacity: 0.8,
  },
});
