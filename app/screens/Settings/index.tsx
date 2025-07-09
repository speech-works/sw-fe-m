import React, { useContext } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Image } from "react-native";
import {
  Ionicons,
  Feather,
  MaterialIcons,
  AntDesign,
} from "@expo/vector-icons";
import Icon from "react-native-vector-icons/FontAwesome5";
import { AuthContext } from "../../contexts/AuthContext";
import * as SecureStore from "expo-secure-store";
import { SECURE_KEYS_NAME } from "../../constants/secureStorageKeys";
import { logoutUser } from "../../api";
import ScreenView from "../../components/ScreenView";
import CustomScrollView from "../../components/CustomScrollView";
import { theme } from "../../Theme/tokens";
import { parseShadowStyle } from "../../util/functions/parseStyles";
import { useUserStore } from "../../stores/user";
import {
  SettingsStackNavigationProp,
  SettingsStackParamList,
} from "../../navigators/stacks/SettingsStack/types";
import { useNavigation } from "@react-navigation/native";

const Settings = (/* Props are removed */) => {
  const navigation =
    useNavigation<SettingsStackNavigationProp<keyof SettingsStackParamList>>();
  const { logout } = useContext(AuthContext);
  const { user } = useUserStore();
  console.log("settings screen getting user", user);
  const handleLogout = async () => {
    const accessToken = await SecureStore.getItemAsync(
      SECURE_KEYS_NAME.SW_APP_JWT_KEY
    );
    const refreshToken = await SecureStore.getItemAsync(
      SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY
    );
    console.log("Access Token:", accessToken);
    console.log("Refresh Token:", refreshToken);
    if (refreshToken && accessToken) {
      await logoutUser({ refreshToken, appJwt: accessToken });
      logout();
    }
  };

  const menuItems = [
    {
      icon: <Icon name="chart-line" size={16} color="#4A5568" />,
      text: "Progress Report",
      onClick: () => {
        navigation.navigate("ProgressDetail");
      },
    },
    {
      icon: <Icon name="bell" size={16} color="#4A5568" />,
      text: "Notifications",
      onClick: () => {},
    },
    {
      icon: <Icon name="history" size={16} color="#4A5568" />,
      text: "Practice History",
      onClick: () => {},
    },
    {
      icon: <Icon name="medal" size={16} color="#4A5568" />,
      text: "Goals & Achievements",
      onClick: () => {},
    },
    {
      icon: <Icon name="tasks" size={16} color="#4A5568" />,
      text: "Preferences", // This item might be redundant if this screen IS settings
      onClick: () => {
        navigation.navigate("Preferences");
      },
    },
    {
      icon: <Icon name="question-circle" size={16} color="#4A5568" />,
      text: "Help & Support",
      onClick: () => {},
    },
  ];

  return (
    <ScreenView style={styles.screenView}>
      <CustomScrollView
        style={styles.screenContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileInfo}>
            <Image
              source={{
                uri: user?.profilePictureUrl,
              }} // Replace with actual user image URL
              style={styles.profileImage}
            />
            <View>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.memberSince}>Member since 2024</Text>
            </View>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Icon name="calendar-alt" size={16} color="#4A5568" />
              <Text style={styles.statText}>32 Practice Sessions</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="star" size={16} color="#4A5568" />
              <Text style={styles.statText}>Level 3 Speaker</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.viewProfileButton}>
            <Text style={styles.viewProfileText}>View Full Profile</Text>
            <Icon name="chevron-right" size={12} color="#3182CE" />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Menu Items */}
        <View style={styles.menuItems}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onClick}
            >
              {item.icon}
              <Text style={styles.menuItemText}>{item.text}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
          <Icon name="sign-out-alt" size={16} color="#E53E3E" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </CustomScrollView>
    </ScreenView>
  );
};

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  screenContainer: {
    // Renamed from menuContainer, styles adjusted
    flex: 1,
    //backgroundColor: "#FFFFFF",
    //paddingHorizontal: 20,
    paddingTop: 20, // General padding for the top of the scroll content
  },
  // Removed modalOverlay and touchableOverlay styles
  // Removed closeButton style
  profileSection: {
    marginBottom: 20,
    backgroundColor: theme.colors.surface.elevated,
    borderRadius: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
    padding: 24,
    // paddingTop: 20, // This can be adjusted or removed if screenContainer's paddingTop is sufficient
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    //backgroundColor: "red",
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    backgroundColor: "#E2E8F0",
  },

  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2D3748",
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: "#718096",
    marginBottom: 15,
  },
  statsContainer: {
    marginVertical: 16,
    alignItems: "flex-start",
    paddingHorizontal: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statText: {
    fontSize: 14,
    color: "#4A5568",
    marginLeft: 8,
  },
  viewProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  viewProfileText: {
    fontSize: 14,
    color: "#3182CE",
    fontWeight: "600",
    marginRight: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 15,
  },
  menuItems: {
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: "#2D3748",
    marginLeft: 15,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 30, // Added some bottom margin for scroll
  },
  signOutText: {
    fontSize: 16,
    color: "#E53E3E",
    marginLeft: 15,
    fontWeight: "600",
  },
});

export default Settings;
