import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Application from "expo-application";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Reanimated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { getAllSessionsOfUser, getWallet, logoutUser } from "../../api";
import { SECURE_KEYS_NAME } from "../../constants/secureStorageKeys";
import { AuthContext } from "../../contexts/AuthContext";
import { useUserStore } from "../../stores/user";
import { getLevelStage, LevelStage } from "../../api/users";
import { purchasesAvailable } from "../../services/purchases";
import { useRestorePurchases } from "../../hooks/useRestorePurchases";
import {
  size,
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
  Text,
  Icon,
  IconName,
} from "../../design-system";
import { AvatarButton } from "../../components/AvatarButton";
import FullProfile from "./components/FullProfile";
import EditProfile, { EditProfileHandle } from "./components/EditProfile";
import DeleteAccountModal from "./components/DeleteAccountModal";
import NotificationPermissionRow from "./components/NotificationPermissionRow";
import {
  useNotificationPermissionStore,
  selectShowNotificationRow,
  selectNotificationsNeedAttention,
} from "../../stores/notificationPermission";
import { showSuccessBottomSheet } from "../../util/functions/bottomSheet";

const Settings = () => {
  const { colors } = useTheme();
  const m = useMotion();
  const navigation = useNavigation<any>();
  const { logout, deleteAccount } = useContext(AuthContext);
  const { user } = useUserStore();
  const showNotificationRow = useNotificationPermissionStore(selectShowNotificationRow);
  const notificationsNeedAttention = useNotificationPermissionStore(
    selectNotificationsNeedAttention,
  );

  const [, setSessionCount] = useState<number>(0);
  const [levelStage, setLevelStage] = useState<LevelStage | null>(null);
  // The badge under the name used to be the literal string "FREE" for everyone,
  // so a member who had just paid was told otherwise on their own profile.
  // Null until the wallet is known: no badge beats a wrong badge.
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [profileMode, setProfileMode] = useState<"view" | "edit">("view");
  // Set when a save succeeds: the success confirmation is itself a native Modal,
  // so we defer it until the sheet's own Modal has fully dismissed (see onDismissed).
  // Stacking two native modals freezes touch handling app-wide on iOS.
  const [pendingSuccess, setPendingSuccess] = useState(false);
  // Same deferral for opening the avatar studio from the profile sheet: close
  // the sheet first, then navigate once its native Modal is gone (never push a
  // screen behind a live Modal).
  const [pendingAvatarNav, setPendingAvatarNav] = useState(false);
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

  // Revoking the refresh token server-side is best effort; clearing the local
  // session is not. This used to call logout() ONLY inside the `if`, with no
  // catch — so a missing/expired token, or simply being offline, left the
  // button inert and the user trapped in an account they had asked to leave.
  // Sign-out has to succeed locally no matter what the server says.
  const handleLogout = async () => {
    try {
      const accessToken = await SecureStore.getItemAsync(
        SECURE_KEYS_NAME.SW_APP_JWT_KEY,
      );
      const refreshToken = await SecureStore.getItemAsync(
        SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY,
      );
      if (refreshToken && accessToken) {
        await logoutUser({ refreshToken, appJwt: accessToken });
      }
    } catch (error) {
      console.error("[settings] server logout failed, signing out anyway:", error);
    } finally {
      logout();
    }
  };

  // Shared with the paywall, which also has to offer Restore (Guideline
  // 3.1.1 wants it on the purchase surface, not only here).
  const { restoring, restore: handleRestorePurchases } = useRestorePurchases();

  // On focus, not on mount: Settings is a tab root that stays mounted, so a
  // membership bought on the paywall would otherwise still read FREE here.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getWallet()
        .then((wallet) => {
          if (!cancelled) setIsMember(wallet.entitlements.includes("membership"));
        })
        .catch((error) =>
          console.error("[settings] Failed to fetch wallet:", error),
        );
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const onViewProfile = () => {
    setIsVisible(true);
  };

  const closeModal = () => {
    setIsVisible(false);
    setProfileMode("view");
  };

  type MenuItem = {
    icon: IconName;
    text: string;
    desc: string;
    onClick: () => void;
  };

  // Grouped, not one flat list of eight. The old order interleaved the two help
  // rows with Reminders and left privacy controls sitting between blocking and
  // billing, so nothing about the list told you what kind of thing a row was.
  const menuGroups: MenuItem[][] = [
    [
      {
        icon: "sliders",
        text: "Preferences",
        desc: "Sounds, voice and appearance",
        onClick: () => navigation.navigate("Preferences"),
      },
      {
        icon: "lock",
        text: "Privacy",
        desc: "Who can find you, and what you share",
        onClick: () => navigation.navigate("Privacy"),
      },
      {
        icon: "bell",
        text: "Reminders",
        desc: "Manage your practice notifications",
        onClick: () => navigation.navigate("Reminders"),
      },
      {
        icon: "bar-chart-2",
        text: "Progress report",
        desc: "Check your speaking progress and trends",
        onClick: () => navigation.navigate("ProgressDetail"),
      },
    ],
    // Both of these used to start with "Help", one row apart, and neither name
    // said which one you wanted. They are now named for what they actually do:
    // one reaches us, the other reaches the stuttering community.
    [
      {
        icon: "help-circle",
        text: "Contact us",
        desc: "Report a problem or send feedback",
        onClick: () => navigation.navigate("HelpSupport"),
      },
      {
        icon: "life-buoy",
        text: "Stuttering support",
        desc: "Organizations and crisis helplines",
        onClick: () => navigation.navigate("Resources"),
      },
    ],
    // purchasesAvailable(), not the raw flag: restorePurchasesAndReconcile()
    // returns null immediately without a RevenueCat key for this platform, so
    // on a keyless build this row is a button that cannot do anything.
    ...(purchasesAvailable()
      ? [
          [
            {
              icon: "refresh-cw" as IconName,
              // The in-flight label is the only feedback this row has. Restore
              // can take a few seconds against the store, and a row that looks
              // inert while it works reads as a dead button — which is exactly
              // how a reviewer would report it.
              //
              // Title case is deliberate here and nowhere else on this screen:
              // "Restore Purchases" is the exact string App Review looks for
              // under Guideline 3.1.1.
              text: restoring ? "Restoring…" : "Restore Purchases",
              desc: "Already paid? Get it back",
              onClick: handleRestorePurchases,
            },
          ],
        ]
      : []),
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
            <AvatarButton
              size={88}
              level={levelStage?.level || user?.level || 1}
              onPress={() => navigation.navigate("AvatarStudio")}
            />
          </Reanimated.View>

          {/* The name is the ONLY thing here allowed to shrink. A long one used
              to widen this row past the card on both sides: the name bleeding
              off the left edge and the plan badge clipped off the right. The
              badge keeps its intrinsic width (it is state, not decoration, and
              it is short by construction); the name truncates, and the full one
              is a tap away on View Profile. */}
          <View style={styles.nameRow}>
            <Text variant="h2" numberOfLines={1} style={styles.name}>
              {user?.name}
            </Text>
            {isMember === null ? null : (
              <View
                style={[
                  styles.proBadge,
                  { backgroundColor: colors.action.primaryTint },
                ]}
              >
                <Text variant="eyebrow" color="accent">
                  {isMember ? "MEMBER" : "FREE"}
                </Text>
              </View>
            )}
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
        {menuGroups.map((group, groupIndex) => (
          <Reanimated.View
            // Index, not the first row's label: the restore row retitles itself
            // to "Restoring…" mid-flight, and a changing key would remount the
            // whole group and replay its entrance under the user's thumb.
            key={groupIndex}
            entering={m.stagger(1 + groupIndex)}
            style={[styles.group, { backgroundColor: colors.surface.default }]}
          >
            {/* Sits above Preferences, and only exists while the OS has
                notifications switched off. `granted === null` means we haven't
                read the permission yet — show nothing rather than accuse the
                device of something we don't know. */}
            {groupIndex === 0 && showNotificationRow ? (
              <NotificationPermissionRow
                urgent={notificationsNeedAttention}
                divider
              />
            ) : null}

            {group.map((item, index) => (
              <ListItem
                key={item.text}
                leftIcon={item.icon}
                label={item.text}
                sublabel={item.desc}
                showChevron
                divider={index < group.length - 1}
                onPress={item.onClick}
              />
            ))}
          </Reanimated.View>
        ))}

        {/* Footer */}
        <Reanimated.View
          entering={m.stagger(1 + menuGroups.length)}
          style={styles.footer}
        >
          <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
            <Text variant="bodySm" color={colors.feedback.dangerText}>
              Log Out
            </Text>
            <Icon name="log-out" size={size.iconInline} color={colors.feedback.dangerText} />
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
          {/* Read from the binary, not hardcoded. This string is what support
              and App Review identify a build by, so an invented number is
              worse than none — it was "v2.4.0 (Build 302)" against a real
              1.0.1 (1). expo-application reports what actually shipped, which
              is the number that matters once OTA updates can move the JS
              bundle underneath a given binary. */}
          <Text variant="caption" color="tertiary">
            {`v${Application.nativeApplicationVersion ?? "—"} (Build ${
              Application.nativeBuildVersion ?? "—"
            })`}
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
          if (pendingAvatarNav) {
            setPendingAvatarNav(false);
            navigation.navigate("AvatarStudio");
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
          <FullProfile
            levelStage={levelStage}
            onEditAvatar={() => {
              setPendingAvatarNav(true);
              setIsVisible(false);
            }}
          />
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
    // Stretch + centre, rather than letting the row size to its content: the
    // card centres its children, so a content-sized row simply grew past both
    // card edges instead of constraining the name inside them.
    alignSelf: "stretch",
    justifyContent: "center",
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
  },
  proBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    flexShrink: 0,
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
