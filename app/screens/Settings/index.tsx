import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/FontAwesome5";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getAllSessionsOfUser, logoutUser } from "../../api";
import BottomSheetModal from "../../components/BottomSheetModal";
import { ScrollView } from "react-native";
import ScreenView from "../../components/ScreenView";
import { SECURE_KEYS_NAME } from "../../constants/secureStorageKeys";
import { BlurView } from "expo-blur";
import { AuthContext } from "../../contexts/AuthContext";
import { useUserStore } from "../../stores/user";
import { theme } from "../../Theme/tokens";
import { getLevelStage, LevelStage } from "../../api/users";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../util/functions/parseStyles";
import BuyPro from "./components/BuyPro";
import FullProfile from "./components/FullProfile";

const HEADER_HEIGHT = 100;

const Settings = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { logout } = useContext(AuthContext);
  const { user } = useUserStore();

  const [sessionCount, setSessionCount] = useState<number>(0);
  const [levelStage, setLevelStage] = useState<LevelStage | null>(null);
  const [isVisible, setIsVisible] = useState(false);

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
  };

  const menuItems = [
    // {
    //   icon: "sliders-h",
    //   iconColor: "#3B82F6", // Blue for preferences
    //   iconBg: "#EFF6FF",
    //   text: "Preferences (Pending)",
    //   onClick: () => {
    //     navigation.navigate("Preferences");
    //   },
    // },
    {
      icon: "chart-line",
      iconColor: "#8B5CF6", // Purple for progress
      iconBg: "#F5F3FF",
      text: "Progress Report",
      onClick: () => {
        navigation.navigate("ProgressDetail");
      },
    },
    {
      icon: "shield-check",
      iconColor: "#10B981", // Green for help
      iconBg: "#ECFDF5",
      text: "Help & Support",
      onClick: () => {
        navigation.navigate("HelpSupport");
      },
    },
    {
      icon: "bell",
      iconColor: "#F59E0B", // Amber for reminders
      iconBg: "#FFFBEB",
      text: "Reminders",
      onClick: () => {
        navigation.navigate("Reminders");
      },
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
      <ScreenView style={[styles.screenView, { paddingHorizontal: 0 }]}>
        {/* Unified Background Mesh Gradient */}
        <View style={StyleSheet.absoluteFillObject}>
          <LinearGradient
            colors={["#FFF7ED", "#FFF", "#FFF"]}
            locations={[0, 0.4, 1]}
            style={{ flex: 1 }}
          />
        </View>

        {/* Floating Premium Header */}
        <BlurView
          intensity={80}
          tint="light"
          style={[
            styles.header,
            {
              paddingTop: insets.top + 20,
              height: HEADER_HEIGHT + insets.top,
            },
          ]}
        >
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>
            Manage your profile and preferences.
          </Text>
        </BlurView>

        <ScrollView
          style={styles.screenContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 130,
            paddingTop: HEADER_HEIGHT + insets.top + 28,
          }}
        >
          {/* Aurora Glass Identity Card */}
          <LinearGradient
            colors={["#0EA5E9", "#2563EB", "#312E81"]} // Sky -> Royal -> Deep Indigo
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileSection}
          >
            {/* Mesh Glow Blobs */}
            <View style={styles.bubbleTopRight} />
            <View style={styles.bubbleBottomLeft} />

            {/* Subtle Watermark */}
            <View style={styles.profileWatermark}>
              <MaterialCommunityIcons
                name="shield-star-outline"
                size={140}
                color="rgba(255, 255, 255, 0.06)"
              />
            </View>

            <View style={styles.profileContent}>
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: user?.profilePictureUrl }}
                  style={styles.profileImage}
                />
                <View style={styles.onlineBadge} />
              </View>

              <View style={styles.centerInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.profileName}>{user?.name}</Text>
                  {/* Pro Badge */}
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>FREE</Text>
                  </View>
                </View>
                <Text style={styles.memberSince}>
                  Member since{" "}
                  {user?.createdAt
                    ? new Date(user.createdAt).getFullYear()
                    : new Date().getFullYear()}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.viewProfileButton}
                onPress={onViewProfile}
              >
                <Text style={styles.viewProfileText}>View Profile</Text>
                <Icon name="chevron-right" size={12} color="#FFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={{ height: 28 }} />

          {/* Action Tiles Menu */}
          <View style={styles.menuSection}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuTile,
                  { borderColor: `${item.iconColor}20` }, // Subtle tint
                ]}
                onPress={item.onClick}
              >
                {/* Premium Watermark */}
                <View style={styles.watermarkContainer}>
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={100}
                    color={`${item.iconColor}08`} // Extremely subtle
                  />
                </View>

                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: item.iconBg,
                      borderColor: `${item.iconColor}40`,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={20}
                    color={item.iconColor}
                  />
                </View>
                <Text style={styles.menuItemText}>{item.text}</Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={16}
                  color="#CBD5E1"
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 28 }} />

          <BuyPro />

          <View style={{ height: 28 }} />

          {/* Minimal Footer */}
          <View style={styles.footer}>
            {/* Floating WaveFace watermark */}
            <Animated.View
              style={[
                styles.voidFaceContainer, // Reusing existing style name for consistency, or we could rename to waveFaceContainer
                {
                  transform: [
                    {
                      translateY: floatAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 10],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* <EditProfileFace
                size={220}
                transparentBg={true}
              /> */}
            </Animated.View>

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleLogout}
            >
              <Text style={styles.signOutText}>Log Out</Text>
              <Icon name="sign-out-alt" size={14} color="#EF4444" />
            </TouchableOpacity>
            <Text style={styles.versionText}>v2.4.0 (Build 302)</Text>
          </View>
        </ScrollView>
      </ScreenView>

      <BottomSheetModal
        visible={isVisible}
        onClose={closeModal}
        maxHeight="80%"
        showHandle={true}
        showCloseButton={true}
      >
        <FullProfile levelStage={levelStage} />
      </BottomSheetModal>
    </>
  );
};

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  screenContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 16,
    gap: 4,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
  },
  subtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  profileSection: {
    marginTop: 10,
    marginBottom: 24,
    borderRadius: 32,
    overflow: "hidden", // Clip internal layout-bubbles
    ...parseShadowStyle(theme.shadow.elevation3),
    shadowColor: "#2563EB",
    shadowOpacity: 0.25,
  },
  profileWatermark: {
    position: "absolute",
    left: -20,
    bottom: -30,
    transform: [{ rotate: "15deg" }],
  },
  // Mesh Glow Blobs
  bubbleTopRight: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  bubbleBottomLeft: {
    position: "absolute",
    bottom: -50,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  profileContent: {
    padding: 24,
    alignItems: "center", // Center everything
    gap: 16,
    zIndex: 1,
  },
  imageContainer: {
    position: "relative",
    marginBottom: 4,
  },
  profileImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#E2E8F0",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.25)", // Glassy halo
  },
  onlineBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#10B981", // Green
    borderWidth: 3,
    borderColor: "#2563EB", // Match Sapphire Blue (Royal)
  },
  centerInfo: {
    alignItems: "center",
    gap: 6,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  proBadge: {
    backgroundColor: "rgba(255,255,255,0.2)", // Glassy
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  proBadgeText: {
    fontSize: 10,
    color: "#FFF",
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  memberSince: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
  },
  viewProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "rgba(255,255,255,0.15)", // Glassy button
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    gap: 8,
    marginTop: 8,
    width: "100%",
  },
  viewProfileText: {
    fontSize: 15,
    color: "#FFF",
    fontWeight: "600",
  },

  // Action Menu Tiles
  menuSection: {
    gap: 12,
    marginBottom: 24,
  },
  menuTile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.2,
    height: 72,
    gap: 16,
    ...parseShadowStyle(theme.shadow.elevation2),
    shadowOpacity: 0.08,
    overflow: "hidden", // Ensure watermark stays clipped
  },
  watermarkContainer: {
    position: "absolute",
    right: -20,
    bottom: -30,
    opacity: 0.6,
    transform: [{ rotate: "-15deg" }],
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  menuItemText: {
    flex: 1,
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: 0.2,
  },

  // Footer
  footer: {
    alignItems: "center",
    gap: 16,
    marginTop: 12,
    position: "relative", // Ensure children can be absolute relative to this
  },
  voidFaceContainer: {
    position: "absolute",
    bottom: -40,
    right: -50,
    zIndex: -1,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  signOutText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#EF4444", // Red
    fontWeight: "600",
  },
  versionText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#94A3B8",
  },
});

export default Settings;
