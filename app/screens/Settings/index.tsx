import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import React, { useContext, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, TouchableOpacity, View } from "react-native";
import { getAllSessionsOfUser, logoutUser } from "../../api";
import { SECURE_KEYS_NAME } from "../../constants/secureStorageKeys";
import { AuthContext } from "../../contexts/AuthContext";
import { useUserStore } from "../../stores/user";
import { getLevelStage, LevelStage } from "../../api/users";
import {
  useTheme,
  spacing,
  radius,
  borderWidth,
  elevation,
  Page,
  Sheet,
  ListItem,
  Button,
  IconButton,
  Avatar,
  Text,
  Icon,
  IconName,
} from "../../design-system";
import FullProfile from "./components/FullProfile";
import EditProfile from "./components/EditProfile";
import DeleteAccountModal from "./components/DeleteAccountModal";

const Settings = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { logout, deleteAccount } = useContext(AuthContext);
  const { user } = useUserStore();

  const [sessionCount, setSessionCount] = useState<number>(0);
  const [levelStage, setLevelStage] = useState<LevelStage | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [profileMode, setProfileMode] = useState<"view" | "edit">("view");

  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [floatAnim]);

  const handleLogout = async () => {
    const accessToken = await SecureStore.getItemAsync(
      SECURE_KEYS_NAME.SW_APP_JWT_KEY,
    );
    const refreshToken = await SecureStore.getItemAsync(
      SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY,
    );
    if (refreshToken && accessToken) {
      await logoutUser({ refreshToken, appJwt: accessToken });
      logout();
    }
  };

  const onViewProfile = () => {
    setIsVisible(true);
  };

  const closeModal = () => {
    setIsVisible(false);
    setProfileMode("view");
  };

  const menuItems: { icon: IconName; text: string; desc: string; onClick: () => void }[] = [
    {
      icon: "sliders",
      text: "Preferences",
      desc: "Manage goals and difficult sounds",
      onClick: () => navigation.navigate("Preferences"),
    },
    {
      icon: "bar-chart-2",
      text: "Progress Report",
      desc: "Check your speaking progress and trends",
      onClick: () => navigation.navigate("ProgressDetail"),
    },
    {
      icon: "help-circle",
      text: "Help & Support",
      desc: "Get assistance and app guidance",
      onClick: () => navigation.navigate("HelpSupport"),
    },
    {
      icon: "bell",
      text: "Reminders",
      desc: "Manage your practice notifications",
      onClick: () => navigation.navigate("Reminders"),
    },
    {
      icon: "life-buoy",
      text: "Help & Resources",
      desc: "Stuttering organizations & crisis support",
      onClick: () => navigation.navigate("Resources"),
    },
  ];

  useEffect(() => {
    if (!user) return;
    const fetchUserSessions = async () => {
      try {
        const sessions = await getAllSessionsOfUser({
          userId: user.id,
          sessionStatus: "COMPLETED",
        });
        setSessionCount(sessions.length);
      } catch (error) {
        console.error("Error fetching user sessions:", error);
      }
    };
    fetchUserSessions();
  }, [user]);

  useEffect(() => {
    if (user && user.level) {
      const fetchLevel = async () => {
        try {
          const res = await getLevelStage();
          setLevelStage(res);
        } catch (e) {
          console.error(e);
        }
      };
      fetchLevel();
    }
  }, [user]);

  return (
    <>
      <Page title="Settings" description="Manage your profile and preferences." tabBarSafe>
        {/* Identity hero — dark card, orange accents */}
        <View
          style={[
            styles.profileSection,
            { backgroundColor: colors.surface.elevated, borderColor: colors.border.default },
            elevation.e2,
          ]}
        >
          <View style={styles.profileImageWrapper}>
            <Avatar image={user?.profilePictureUrl} shape="rounded" size={88} />
            <View style={[styles.levelBadge, { backgroundColor: colors.action.primary, borderColor: colors.surface.elevated }]}>
              <Text variant="caption" color={colors.action.onPrimary}>
                {levelStage?.level || user?.level || 1}
              </Text>
            </View>
          </View>

          <View style={styles.nameRow}>
            <Text variant="h2">{user?.name}</Text>
            <View style={[styles.proBadge, { backgroundColor: colors.action.primary + "1F" }]}>
              <Text variant="label" color={colors.action.primary}>
                FREE
              </Text>
            </View>
          </View>
          <Text variant="bodySm" color="secondary">
            Member since{" "}
            {user?.createdAt
              ? new Date(user.createdAt).getFullYear()
              : new Date().getFullYear()}
          </Text>

          <Button
            label="View Profile"
            variant="primary"
            rightIcon="chevron-right"
            onPress={onViewProfile}
            style={styles.viewProfileButton}
          />
        </View>

        {/* Menu */}
        <View style={[styles.group, { backgroundColor: colors.surface.default }]}>
          {menuItems.map((item, index) => (
            <ListItem
              key={item.text}
              leftIcon={item.icon}
              label={item.text}
              sublabel={item.desc}
              showChevron
              divider={index < menuItems.length - 1}
              onPress={item.onClick}
            />
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
            <Text variant="bodySm" color={colors.feedback.dangerText}>
              Log Out
            </Text>
            <Icon name="log-out" size={14} color={colors.feedback.dangerText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={() => setShowDeleteModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Delete account"
          >
            <Text variant="caption" color={colors.feedback.dangerText} style={styles.deleteAccountText}>
              Delete Account
            </Text>
          </TouchableOpacity>
          <Text variant="caption" color="tertiary">
            v2.4.0 (Build 302)
          </Text>
        </View>
      </Page>

      <Sheet
        visible={isVisible}
        onClose={closeModal}
        title={profileMode === "view" ? "My Profile" : "Edit Profile"}
        right={
          <>
            {profileMode === "view" ? (
              <IconButton name="edit-2" onPress={() => setProfileMode("edit")} />
            ) : null}
            <IconButton name="x" onPress={closeModal} />
          </>
        }
      >
        {profileMode === "view" ? (
          <FullProfile levelStage={levelStage} />
        ) : (
          <EditProfile onSave={() => setProfileMode("view")} />
        )}
      </Sheet>

      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={deleteAccount}
      />
    </>
  );
};

const styles = StyleSheet.create({
  profileSection: {
    borderRadius: radius.card,
    borderWidth: borderWidth.thin,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing["3xl"],
    alignItems: "center",
    gap: spacing.md,
  },
  profileImageWrapper: {
    position: "relative",
    width: 88,
    height: 88,
    marginBottom: spacing.xs,
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
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  proBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  viewProfileButton: {
    width: "100%",
    marginTop: spacing.sm,
  },
  group: {
    borderRadius: radius.card,
    overflow: "hidden",
  },
  footer: {
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  deleteAccountButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  deleteAccountText: {
    textDecorationLine: "underline",
  },
});

export default Settings;
