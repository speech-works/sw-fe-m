import { StyleSheet, Text, Image, View, TouchableOpacity } from "react-native";
import React from "react";
import CustomScrollView from "../../../components/CustomScrollView";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../util/functions/parseStyles";
import { theme } from "../../../Theme/tokens";
import { useUserStore } from "../../../stores/user";
import { LevelData } from "../../../util/functions/levels-xp";
import Icon from "react-native-vector-icons/FontAwesome5";
import { Linking } from "react-native";
import { triggerToast } from "../../../util/functions/toast";
import EditProfile from "./EditProfile";

interface FullProfileProps {
  userLevelData?: LevelData;
  userLevel?: number;
}
const FullProfile = ({ userLevel, userLevelData }: FullProfileProps) => {
  const { user } = useUserStore();
  const [mode, setMode] = React.useState<"view" | "edit">("view");
  const onProfileEdit = () => {
    setMode("edit");
  };
  const onProfileSave = () => {
    setMode("view");
  };

  return (
    <>
      {mode === "view" ? (
        <CustomScrollView
          style={styles.screenContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <Text style={styles.headerText}>My Profile</Text>
          </View>
          <View style={styles.profileSection}>
            <View style={styles.profileInfo}>
              <View style={styles.profileImageWrapper}>
                <Image
                  source={{
                    uri: user?.profilePictureUrl,
                  }}
                  style={styles.profileImage}
                />
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>{userLevel}</Text>
                </View>
              </View>
              <View style={styles.profileDetails}>
                <Text style={styles.profileName}>{user?.name}</Text>
                <Text style={styles.memberSince}>
                  Member since {user?.createdAt?.getFullYear()}
                </Text>
                <View style={styles.levelTitle}>
                  <Text style={styles.levelTitleText}>
                    {userLevelData?.levelTitle}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onProfileEdit}
                style={styles.editButton}
              >
                <Text style={styles.editText}>Edit</Text>
                <Icon
                  solid
                  name="user-edit"
                  size={12}
                  color={theme.colors.actionPrimary.default}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.personalInfoContainer}>
              <View style={styles.row}>
                <Icon
                  solid
                  name="user"
                  size={18}
                  color={theme.colors.text.title}
                />
                <Text style={styles.titleText}>Personal Information</Text>
              </View>
              <View style={styles.rowContainer}>
                <View style={styles.row}>
                  <Icon
                    name="envelope"
                    size={18}
                    color={theme.colors.text.title}
                    style={styles.titleIcon}
                  />
                  <View>
                    <Text style={styles.smallDescText}>Email</Text>
                    <Text style={styles.valueText}>{user?.email}</Text>
                  </View>
                </View>
                <View style={styles.row}>
                  <Icon
                    name="mobile-alt"
                    size={24}
                    color={theme.colors.text.title}
                  />
                  <View>
                    <Text style={styles.smallDescText}>Phone</Text>
                    <Text style={styles.valueText}>
                      {user?.phoneNumber || "-"}
                    </Text>
                  </View>
                </View>
                <View style={styles.row}>
                  <Icon
                    name="calendar"
                    size={18}
                    color={theme.colors.text.title}
                    style={styles.titleIcon}
                  />
                  <View>
                    <Text style={styles.smallDescText}>Date of Birth</Text>
                    <Text style={styles.valueText}>
                      {user?.dob
                        ? new Date(user.dob).toLocaleDateString("en-GB")
                        : "-"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.personalInfoContainer}>
              <View style={styles.row}>
                <Icon
                  solid
                  name="info-circle"
                  size={18}
                  color={theme.colors.text.title}
                />
                <Text style={styles.titleText}>About me</Text>
              </View>
              <Text style={styles.valueText}>{user?.bio}</Text>
            </View>
            <View style={styles.personalInfoContainer}>
              <View style={styles.row}>
                <Icon
                  solid
                  name="share-alt"
                  size={18}
                  color={theme.colors.text.title}
                />
                <Text style={styles.titleText}>Social Links</Text>
              </View>
              <View style={styles.rowContainer}>
                <View style={[styles.row, { justifyContent: "space-between" }]}>
                  <View style={styles.row}>
                    <Icon
                      name="facebook-square"
                      size={16}
                      color={theme.colors.text.title}
                    />
                    <Text style={styles.valueText}>Facebook</Text>
                  </View>
                  <Icon
                    name="external-link-alt"
                    size={12}
                    color={theme.colors.text.title}
                    onPress={() => {
                      const link = user?.links?.social.facebook;
                      if (!link) {
                        triggerToast(
                          "Error",
                          "Can't open Facebook",
                          "No Facebook link provided"
                        );
                        return;
                      }

                      Linking.openURL(link).catch((err) =>
                        console.error("Failed to open Facebook:", err)
                      );
                    }}
                  />
                </View>
                <View style={[styles.row, { justifyContent: "space-between" }]}>
                  <View style={styles.row}>
                    <Icon
                      name="instagram"
                      size={16}
                      color={theme.colors.text.title}
                    />
                    <Text style={styles.valueText}>Instagram</Text>
                  </View>
                  <Icon
                    name="external-link-alt"
                    size={12}
                    color={theme.colors.text.title}
                    onPress={() => {
                      const link = user?.links?.social.instagram;
                      if (!link) {
                        triggerToast(
                          "Error",
                          "Can't open Instagram",
                          "No Instagram link provided"
                        );
                        return;
                      }

                      Linking.openURL(link).catch((err) =>
                        console.error("Failed to open Instagram:", err)
                      );
                    }}
                  />
                </View>
                <View style={[styles.row, { justifyContent: "space-between" }]}>
                  <View style={styles.row}>
                    <Icon
                      name="whatsapp"
                      size={16}
                      color={theme.colors.text.title}
                    />
                    <Text style={styles.valueText}>Whatsapp</Text>
                  </View>
                  <Icon
                    name="external-link-alt"
                    size={12}
                    color={theme.colors.text.title}
                    onPress={() => {
                      const link = user?.links?.social.whatsapp;
                      if (!link) {
                        triggerToast(
                          "Error",
                          "Can't open Whatsapp",
                          "No Whatsapp link provided"
                        );
                        return;
                      }

                      Linking.openURL(link).catch((err) =>
                        console.error("Failed to open Whatsapp:", err)
                      );
                    }}
                  />
                </View>
              </View>
            </View>
          </View>
        </CustomScrollView>
      ) : (
        <EditProfile onSave={onProfileSave} />
      )}
    </>
  );
};

export default FullProfile;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingTop: 20,
  },
  headerContainer: {
    padding: 16,
  },
  headerText: {
    color: theme.colors.text.title,
    ...parseTextStyle(theme.typography.Heading3),
    textAlign: "center",
  },
  profileSection: {
    marginBottom: 20,
    backgroundColor: theme.colors.surface.elevated,
    borderRadius: 16,
    paddingVertical: 16,
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
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
  },
  levelBadge: {
    position: "absolute",
    bottom: 2,
    right: 0,
    backgroundColor: theme.colors.library.orange[800],
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text.title,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: "#718096",
    marginBottom: 8,
  },
  levelTitle: {
    backgroundColor: theme.colors.surface.default,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
  },
  levelTitleText: {
    color: theme.colors.text.title,
    ...parseTextStyle(theme.typography.BodyDetails),
    textAlign: "center",
  },
  editButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    padding: 8,
    borderRadius: 24,
    borderColor: theme.colors.actionPrimary.default,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  editText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.actionPrimary.default,
    fontWeight: "600",
  },
  infoContainer: { gap: 24 },
  rowContainer: {
    gap: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  personalInfoContainer: {
    padding: 16,
    borderColor: theme.colors.border.default,
    borderRadius: 12,
    borderWidth: 1,
    gap: 24,
  },
  titleIcon: {
    alignSelf: "flex-start",
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    fontWeight: "bold",
  },
  smallDescText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    fontWeight: "600",
  },
  valueText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
});
