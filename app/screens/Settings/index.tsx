import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import React, { useContext, useEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Reanimated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { getAllSessionsOfUser, logoutUser } from "../../api";
import { SECURE_KEYS_NAME } from "../../constants/secureStorageKeys";
import { AuthContext } from "../../contexts/AuthContext";
import { useUserStore } from "../../stores/user";
import { getLevelStage, LevelStage } from "../../api/users";
import {
  useTheme,
  useMotion,
  easing,
  spacing,
  radius,
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
import EditProfile, { EditProfileHandle } from "./components/EditProfile";
import DeleteAccountModal from "./components/DeleteAccountModal";
import { showSuccessBottomSheet } from "../../util/functions/bottomSheet";

const Settings = () => {
  const { colors } = useTheme();
  const m = useMotion();
  const navigation = useNavigation<any>();
  const { logout, deleteAccount } = useContext(AuthContext);
  const { user } = useUserStore();

  const [sessionCount, setSessionCount] = useState<number>(0);
  const [levelStage, setLevelStage] = useState<LevelStage | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [profileMode, setProfileMode] = useState<"view" | "edit">("view");
  // Set when a save succeeds: the success confirmation is itself a native Modal,
  // so we defer it until the sheet's own Modal has fully dismissed (see onDismissed).
  // Stacking two native modals freezes touch handling app-wide on iOS.
  const [pendingSuccess, setPendingSuccess] = useState(false);
  const editRef = useRef<EditProfileHandle>(null);

  // Ambient avatar float — a slow, gentle rise/fall (8s round trip). Disabled entirely
  // under reduced motion (ambient loops are the first thing that should go quiet).
  const FLOAT_PERIOD = 4000; // half-cycle (ms); bespoke ambient period, separate from UI motion
  const floatY = useSharedValue(0);

  useEffect(() => {
    if (m.reduced) {
      floatY.value = 0;
      return;
    }
    floatY.value = withRepeat(
      withTiming(-6, { duration: FLOAT_PERIOD, easing: easing.loop }),
      -1,
      true, // yoyo: 0 → -6 → 0
    );
    return () => cancelAnimation(floatY);
  }, [m.reduced, floatY]);

  const avatarFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

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
        {/* Identity hero — flat surface, orange accents (no redundant chrome) */}
        <Reanimated.View
          entering={m.stagger(0)}
          style={[styles.profileSection, { backgroundColor: colors.surface.elevated }]}
        >
          <Reanimated.View style={[styles.avatarWrap, avatarFloatStyle]}>
            <Avatar
              image={user?.profilePictureUrl}
              shape="rounded"
              size={88}
              level={levelStage?.level || user?.level || 1}
            />
          </Reanimated.View>

          <View style={styles.nameRow}>
            <Text variant="h2">{user?.name}</Text>
            <View style={[styles.proBadge, { backgroundColor: colors.action.primaryTint }]}>
              <Text variant="label" color="accent">
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
        </Reanimated.View>

        {/* Menu */}
        <Reanimated.View
          entering={m.stagger(1)}
          style={[styles.group, { backgroundColor: colors.surface.default }]}
        >
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
        </Reanimated.View>

        {/* Footer */}
        <Reanimated.View entering={m.stagger(2)} style={styles.footer}>
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
        </Reanimated.View>
      </Page>

      <Sheet
        visible={isVisible}
        onClose={closeModal}
        onDismissed={() => {
          if (pendingSuccess) {
            setPendingSuccess(false);
            showSuccessBottomSheet(
              "Profile Updated",
              "Your changes have been saved successfully.",
            );
          }
        }}
        title={profileMode === "view" ? "My Profile" : "Edit Profile"}
        right={
          profileMode === "view" ? (
            <>
              <IconButton name="edit-2" onPress={() => setProfileMode("edit")} />
              <IconButton name="x" onPress={closeModal} />
            </>
          ) : (
            <>
              <Button
                label="Save"
                size="sm"
                fullWidth={false}
                onPress={() => editRef.current?.save()}
              />
              <IconButton name="x" onPress={closeModal} />
            </>
          )
        }
      >
        {profileMode === "view" ? (
          <FullProfile levelStage={levelStage} />
        ) : (
          <EditProfile
            ref={editRef}
            onSave={() => {
              // Close the sheet first; the success toast fires from onDismissed
              // once this sheet's native Modal is gone (never two modals at once).
              setProfileMode("view");
              setPendingSuccess(true);
              setIsVisible(false);
            }}
          />
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing["3xl"],
    alignItems: "center",
    gap: spacing.md,
  },
  avatarWrap: {
    marginBottom: spacing.xs,
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
