import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";
import React, { useContext, useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getAllSessionsOfUser, logoutUser } from "../../api";
import BottomSheetModal from "../../components/BottomSheetModal";
import CustomScrollView from "../../components/CustomScrollView";
import ScreenView from "../../components/ScreenView";
import { SECURE_KEYS_NAME } from "../../constants/secureStorageKeys";
import { AuthContext } from "../../contexts/AuthContext";
import {
  SettingsStackNavigationProp,
  SettingsStackParamList,
} from "../../navigators/stacks/SettingsStack/types";
import { useUserStore } from "../../stores/user";
import { theme } from "../../Theme/tokens";
import { ROUTE_NAMES } from "../../constants/routes";
import { useTourStore } from "../../stores/tour";
import {
  getUnlockedLevelsFromXP,
  LevelData,
} from "../../util/functions/levels-xp";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../util/functions/parseStyles";
import BuyPro from "./components/BuyPro";
import FullProfile from "./components/FullProfile";
import ExplorerFace from "../../assets/sw-faces/ExplorerFace";

const Settings = () => {
  const navigation = useNavigation<any>();
  const { logout } = useContext(AuthContext);
  const { user } = useUserStore();

  const [sessionCount, setSessionCount] = useState<number>(0);
  const [userLevel, setUserLevel] = useState<number>(0);
  const [userLevelData, setUserLevelData] = useState<LevelData>();
  const [isVisible, setIsVisible] = useState(false);
  const [isTourVisible, setIsTourVisible] = useState(false);

  const { resetHomeTour, resetExploreTour } = useTourStore();

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

  const openTourModal = () => setIsTourVisible(true);
  const closeTourModal = () => setIsTourVisible(false);

  const handleRestartHomeTour = () => {
    resetHomeTour();
    closeTourModal();
    navigation.navigate("HomeStack");
  };

  const handleRestartExploreTour = () => {
    resetExploreTour();
    closeTourModal();
    navigation.navigate("ExploreStack");
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
      icon: "question-circle",
      iconColor: "#10B981", // Green for help
      iconBg: "#ECFDF5",
      text: "Help & Support",
      onClick: () => {
        navigation.navigate("HelpSupport");
      },
    },
    {
      icon: "map-signs",
      iconColor: "#F59E0B", // Amber for tour
      iconBg: "#FFFBEB",
      text: "App Tour",
      onClick: openTourModal,
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
    if (user && user.totalXp) {
      const levelData = getUnlockedLevelsFromXP(user.totalXp);
      const latestLevel = levelData[levelData.length - 1];
      setUserLevel(latestLevel.level);
      setUserLevelData(latestLevel.data);
    }
  }, [user]);

  return (
    <>
      <ScreenView style={[styles.screenView, { paddingHorizontal: 0 }]}>
        {/* Unified Background Gradient */}
        <View style={StyleSheet.absoluteFillObject}>
          <LinearGradient
            colors={["#FFF7ED", "#FFF", "#FFF"]}
            locations={[0, 0.4, 1]}
            style={{ flex: 1 }}
          />
        </View>

        <CustomScrollView
          style={styles.screenContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 130 }}
        >
          {/* Header Title */}
          <Text style={styles.pageTitle}>Settings</Text>

          {/* Aurora Glass Identity Card (Concept A) */}
          <LinearGradient
            colors={["#22d3ee", "#60a5fa", "#818cf8"]} // Cyan -> Blue -> Indigo
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileSection}
          >
            {/* Mesh Glow Blobs */}
            <View style={styles.bubbleTopRight} />
            <View style={styles.bubbleBottomLeft} />

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

          {/* Action Tiles Menu */}
          <View style={styles.menuSection}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuTile}
                onPress={item.onClick}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: item.iconBg },
                  ]}
                >
                  <Icon name={item.icon} size={18} color={item.iconColor} />
                </View>
                <Text style={styles.menuItemText}>{item.text}</Text>
                <Icon name="chevron-right" size={14} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>

          <BuyPro />

          {/* Minimal Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleLogout}
            >
              <Text style={styles.signOutText}>Log Out</Text>
              <Icon name="sign-out-alt" size={14} color="#EF4444" />
            </TouchableOpacity>
            <Text style={styles.versionText}>v2.4.0 (Build 302)</Text>
          </View>
        </CustomScrollView>
      </ScreenView>

      <BottomSheetModal
        visible={isTourVisible}
        onClose={closeTourModal}
        maxHeight="75%"
      >
        <View style={styles.tourModalContent}>
          <ExplorerFace size={100} shouldAnimate />
          <View style={styles.tourTextContainer}>
            <Text style={styles.tourModalTitle}>Interactive Guide</Text>
            <Text style={styles.tourModalSubtitle}>
              Which part of the app would you like to explore?
            </Text>
          </View>

          <View style={styles.tourOptions}>
            <TouchableOpacity
              style={styles.tourOption}
              onPress={handleRestartHomeTour}
            >
              <View
                style={[styles.tourOptionIcon, { backgroundColor: "#EFF6FF" }]}
              >
                <MaterialCommunityIcons
                  name="home-variant"
                  size={24}
                  color="#3B82F6"
                />
              </View>
              <Text style={styles.tourOptionText}>Home Page</Text>
              <Icon name="chevron-right" size={14} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tourOption}
              onPress={handleRestartExploreTour}
            >
              <View
                style={[styles.tourOptionIcon, { backgroundColor: "#ECFDF5" }]}
              >
                <MaterialCommunityIcons
                  name="view-grid-outline"
                  size={24}
                  color="#10B981"
                />
              </View>
              <Text style={styles.tourOptionText}>Explore Page</Text>
              <Icon name="chevron-right" size={14} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        visible={isVisible}
        onClose={closeModal}
        maxHeight="80%"
      >
        <FullProfile userLevel={userLevel} userLevelData={userLevelData} />
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
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  pageTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    marginBottom: 24,
  },
  // Aurora Glass Card Styles
  profileSection: {
    marginBottom: 24,
    borderRadius: 24,
    ...parseShadowStyle(theme.shadow.elevation1),
    overflow: "hidden", // Clip bubbles
    position: "relative",
    // No bg color here, strictly gradient
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
    borderColor: "rgba(255,255,255,0.2)", // Glassy halo
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
    borderColor: "#FB923C", // Match Gradient (Orange 400)
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
    padding: 16,
    borderRadius: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
    gap: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemText: {
    flex: 1,
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    fontWeight: "500",
  },

  // Footer
  footer: {
    alignItems: "center",
    gap: 16,
    marginTop: 12,
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
  // Tour Modal Styles
  tourModalContent: {
    padding: 24,
    paddingBottom: 64,
    alignItems: "center",
    gap: 24,
  },
  tourTextContainer: {
    alignItems: "center",
    gap: 4,
  },
  tourModalTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  tourModalSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
  },
  tourOptions: {
    width: "100%",
    gap: 12,
  },
  tourOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  tourOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tourOptionText: {
    flex: 1,
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    fontWeight: "600",
  },
});

export default Settings;
