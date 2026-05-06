import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../Theme/tokens";
import CustomScrollView from "../../../components/CustomScrollView";
import { useUserStore } from "../../../stores/user";
import { LevelStage } from "../../../api/users";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../util/functions/parseStyles";
import { showErrorBottomSheet } from "../../../util/functions/bottomSheet";
import EditProfile from "./EditProfile";
import EditProfileFace from "../../../assets/sw-faces/EditProfileFace";

interface FullProfileProps {
  levelStage?: LevelStage | null;
}
// Helper component for uniform lively icons
const LivelyIcon = ({
  name,
  color,
  bg,
}: {
  name: string;
  color: string;
  bg: string;
}) => (
  <View style={[styles.iconContainer, { backgroundColor: bg }]}>
    <Icon solid name={name} size={16} color={color} />
  </View>
);

const FullProfile = ({ levelStage }: FullProfileProps) => {
  const insets = useSafeAreaInsets();
  const { user } = useUserStore();
  const [mode, setMode] = React.useState<"view" | "edit">("view");
  const onProfileEdit = () => {
    setMode("edit");
  };
  const onProfileSave = () => {
    setMode("view");
  };

  return (
    <View style={styles.root}>
      {mode === "view" ? (
        <>
          <View style={styles.headerContainer}>
            <Text style={styles.headerText}>My Profile</Text>
          </View>
          <CustomScrollView
            style={styles.screenContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Card */}
            <View style={{ width: "100%" }}>
              <LinearGradient
                colors={["#fb923c", "#f97316", "#ea580c"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.profileSection}
              >
                {/* Mesh Glow Blobs */}
                <View style={styles.bubbleTopRight} />
                <View style={styles.bubbleBottomLeft} />

                <View style={styles.profileInfo}>
                  <View style={styles.profileImageWrapper}>
                    <Image
                      source={{ uri: user?.profilePictureUrl }}
                      style={styles.profileImage}
                    />
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelBadgeText}>
                        {levelStage?.level || user?.level || 1}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.profileDetails}>
                    <Text style={styles.profileName}>{user?.name}</Text>
                    <Text style={styles.memberSince}>
                      Member since{" "}
                      {user?.createdAt
                        ? new Date(user.createdAt).getFullYear()
                        : new Date().getFullYear()}
                    </Text>
                    {levelStage && (
                      <View style={styles.levelTitle}>
                        <Text style={styles.levelTitleText}>
                          {levelStage.fullTitle}
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={onProfileEdit}
                    style={styles.editButton}
                  >
                    <Text style={styles.editText}>Edit</Text>
                    <Icon solid name="user-edit" size={12} color="#FFF" />
                  </TouchableOpacity>
                </View>

                {/* Character Watermark on Card */}
                <View style={styles.cardFaceContainer}>
                  <EditProfileFace size={96} transparentBg />
                </View>
              </LinearGradient>
            </View>
            <View
              style={[
                styles.infoContainer,
                { paddingBottom: Math.max(insets.bottom, 40) },
              ]}
            >
              {/* Personal Info Section */}
              <View style={styles.cardContainer}>
                <View style={styles.sectionHeader}>
                  <LivelyIcon name="user" color="#EA580C" bg="#FFF7ED" />
                  <Text style={styles.sectionTitle}>Personal Information</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <View style={styles.fieldRow}>
                    <View style={styles.fieldIconWrapper}>
                      <Icon name="envelope" size={14} color="#94A3B8" />
                    </View>
                    <View style={styles.fieldContent}>
                      <Text style={styles.fieldLabel}>Email</Text>
                      <Text style={styles.fieldValue}>{user?.email}</Text>
                    </View>
                  </View>

                  <View style={styles.separator} />

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldIconWrapper}>
                      <Icon name="mobile-alt" size={16} color="#94A3B8" />
                    </View>
                    <View style={styles.fieldContent}>
                      <Text style={styles.fieldLabel}>Phone</Text>
                      <Text style={styles.fieldValue}>
                        {user?.phoneNumber || "-"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.separator} />

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldIconWrapper}>
                      <Icon name="calendar" size={14} color="#94A3B8" />
                    </View>
                    <View style={styles.fieldContent}>
                      <Text style={styles.fieldLabel}>Date of Birth</Text>
                      <Text style={styles.fieldValue}>
                        {user?.dob
                          ? new Date(user.dob).toLocaleDateString("en-GB")
                          : "-"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* About Me Section */}
              <View style={styles.cardContainer}>
                <View style={styles.sectionHeader}>
                  <LivelyIcon name="info-circle" color="#3B82F6" bg="#EFF6FF" />
                  <Text style={styles.sectionTitle}>About Me</Text>
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldValue, { lineHeight: 24 }]}>
                    {user?.bio || "No bio added yet."}
                  </Text>
                </View>
              </View>

              {/* Social Links Section */}
              <View style={styles.cardContainer}>
                <View style={styles.sectionHeader}>
                  <LivelyIcon name="share-alt" color="#10B981" bg="#ECFDF5" />
                  <Text style={styles.sectionTitle}>Social Links</Text>
                </View>

                <View style={styles.socialGrid}>
                  {/* Facebook */}
                  <TouchableOpacity
                    style={styles.socialItem}
                    onPress={() => {
                      const link = user?.links?.social.facebook;
                      if (!link)
                        return showErrorBottomSheet(
                          "Can't open Facebook",
                          "No link provided",
                        );
                      Linking.openURL(link).catch(console.error);
                    }}
                  >
                    <View
                      style={[
                        styles.socialIcon,
                        { backgroundColor: "#EFF6FF" },
                      ]}
                    >
                      <Icon name="facebook-f" size={20} color="#2563EB" />
                    </View>
                    <Text style={styles.socialLabel}>Facebook</Text>
                  </TouchableOpacity>

                  {/* Instagram */}
                  <TouchableOpacity
                    style={styles.socialItem}
                    onPress={() => {
                      const link = user?.links?.social.instagram;
                      if (!link)
                        return showErrorBottomSheet(
                          "Can't open Instagram",
                          "No link provided",
                        );
                      Linking.openURL(link).catch(console.error);
                    }}
                  >
                    <View
                      style={[
                        styles.socialIcon,
                        { backgroundColor: "#FDF2F8" },
                      ]}
                    >
                      <Icon name="instagram" size={20} color="#DB2777" />
                    </View>
                    <Text style={styles.socialLabel}>Instagram</Text>
                  </TouchableOpacity>

                  {/* Whatsapp */}
                  <TouchableOpacity
                    style={styles.socialItem}
                    onPress={() => {
                      const link = user?.links?.social.whatsapp;
                      if (!link)
                        return showErrorBottomSheet(
                          "Can't open Whatsapp",
                          "No link provided",
                        );
                      Linking.openURL(link).catch(console.error);
                    }}
                  >
                    <View
                      style={[
                        styles.socialIcon,
                        { backgroundColor: "#F0FDF4" },
                      ]}
                    >
                      <Icon name="whatsapp" size={20} color="#16A34A" />
                    </View>
                    <Text style={styles.socialLabel}>Whatsapp</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </CustomScrollView>
        </>
      ) : (
        <EditProfile onSave={onProfileSave} />
      )}
    </View>
  );
};

export default FullProfile;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  screenContainer: {
    flex: 1,
    paddingTop: 8,
  },
  headerContainer: {
    paddingTop: 32,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    zIndex: 10,
  },
  headerText: {
    color: theme.colors.text.title,
    ...parseTextStyle(theme.typography.Heading3),
    textAlign: "center",
  },
  profileSection: {
    marginBottom: 24, // increased
    borderRadius: 24, // softer
    paddingTop: 32,
    paddingBottom: 24,
    overflow: "hidden",
    position: "relative",
    marginHorizontal: 16, // Add margin from edges
    ...parseShadowStyle(theme.shadow.elevation2), // Add shadow to card
  },
  // Mesh Glow Blobs
  bubbleTopRight: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#FFFFFF",
    opacity: 0.2, // Subtle white glow
  },
  bubbleBottomLeft: {
    position: "absolute",
    bottom: -20,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#C2410C", // Deep Orange (700)
    opacity: 0.4, // Deep warm glow
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
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
    backgroundColor: "#E2E8F0",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  levelBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#C2410C", // Darker orange
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  levelBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  profileDetails: {
    flex: 1,
    justifyContent: "center",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 4,
    letterSpacing: -0.6,
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  memberSince: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 8,
  },
  levelTitle: {
    backgroundColor: "rgba(255,255,255,0.2)", // Glassy
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  levelTitleText: {
    color: "#FFFFFF",
    ...parseTextStyle(theme.typography.BodyDetails),
    textAlign: "center",
    fontWeight: "600",
  },
  editButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    padding: 8,
    borderRadius: 24,
    borderColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  editText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#FFFFFF",
    fontWeight: "600",
  },
  infoContainer: {
    gap: 20,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16, // Nesting: 24 - 8 = 16
    padding: 20,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B", // Dark Slate
  },
  fieldGroup: {
    gap: 16,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  fieldIconWrapper: {
    width: 32,
    alignItems: "center",
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    color: "#64748B", // Slate 500
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 16,
    color: "#0F172A", // Slate 900
    fontWeight: "500",
  },
  separator: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 48, // inset
  },
  socialGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
  },
  socialItem: {
    alignItems: "center",
    gap: 8,
  },
  socialIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  socialLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  cardFaceContainer: {
    position: "absolute",
    right: -15,
    bottom: -15,
    zIndex: 0,
    opacity: 0.8,
  },
  faceContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    gap: 12,
    opacity: 0.9,
  },
  faceLabel: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
