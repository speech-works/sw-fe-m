import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/FontAwesome5";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import {
  getUserPreferences,
  updateUserPreferences,
} from "../../../api/settings/userPreference";
import { PracticeGoalType } from "../../../api/settings/userPreference/types";

import CustomScrollView from "../../../components/CustomScrollView";
import ScreenView from "../../../components/ScreenView";
import { useUserStore } from "../../../stores/user";
import { theme } from "../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../util/functions/parseStyles";

import { LinearGradient } from "expo-linear-gradient";

import { SettingsStackNavigationProp } from "../../../navigators/stacks/SettingsStack/types";

const Preferences = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<SettingsStackNavigationProp<"Preferences">>();
  const { user } = useUserStore();
  const [targetMins, setTargetMins] = useState(15);
  const [taskCount, setTaskCount] = useState(3);
  const [selectedGoalType, setSelectedGoalType] = useState("");

  const handleIncrementTargetMins = async () => {
    if (!user) return;
    setTargetMins((prevMins) => {
      const dailyPracticeLimitMinutes = prevMins + 5;
      updateUserPreferences(user.id, { dailyPracticeLimitMinutes });
      return dailyPracticeLimitMinutes;
    });
  };

  const handleDecrementTargetMins = async () => {
    if (!user) return;
    setTargetMins((prevMins) => {
      const dailyPracticeLimitMinutes = Math.max(5, prevMins - 5);
      updateUserPreferences(user.id, { dailyPracticeLimitMinutes });
      return dailyPracticeLimitMinutes;
    });
  };

  const handleIncrementTaskCount = async () => {
    if (!user) return;
    setTaskCount((prevMins) => {
      const dailyTaskCount = prevMins + 1;
      updateUserPreferences(user.id, { dailyTaskCount });
      return dailyTaskCount;
    });
  };

  const handleDecrementTaskCount = async () => {
    if (!user) return;
    setTaskCount((prevMins) => {
      const dailyTaskCount = Math.max(1, prevMins - 1);
      updateUserPreferences(user.id, { dailyTaskCount });
      return dailyTaskCount;
    });
  };

  useEffect(() => {
    if (!user) return;
    const fetchPreferences = async () => {
      const pref = await getUserPreferences(user.id);
      if (!pref) return;
      const {
        practiceGoalType,
        dailyPracticeLimitMinutes,
        dailyTaskCount,
      } = pref;
      if (practiceGoalType) {
        if (practiceGoalType === PracticeGoalType.TASK_BASED) {
          setSelectedGoalType("Task based");
        } else if (practiceGoalType === PracticeGoalType.TIME_BASED) {
          setSelectedGoalType("Time based");
        }
      }
      if (dailyPracticeLimitMinutes) setTargetMins(dailyPracticeLimitMinutes);
      if (dailyTaskCount) setTaskCount(dailyTaskCount);
    };
    fetchPreferences();
  }, [user]);

  const prefItems = [
    {
      id: "difficult-sounds",
      title: "Difficult Sounds",
      desc: `${user?.fearedSounds?.length || 0} sounds selected`,
      icon: "bullhorn",
      iconColor: "#2563EB",
      bgColor: "#EFF6FF",
      onPress: () => navigation.navigate("FearedSounds" as any),
    }
  ];

  return (
    <ScreenView style={[styles.screenView, { paddingHorizontal: 0 }]}>
      {/* Background Gradient */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FFF7ED", "#FFF", "#FFF"]}
          locations={[0, 0.4, 1]}
          style={{ flex: 1 }}
        />
      </View>

      <BlurView
        intensity={80}
        tint="light"
        style={[
          styles.header,
          { paddingTop: insets.top + 10, height: 60 + insets.top },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon
            name="chevron-left"
            size={16}
            color={theme.colors.text.title}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferences</Text>
        <View style={{ width: 32 }} />
      </BlurView>

      <View style={styles.container}>
        <CustomScrollView
          contentContainerStyle={[
            styles.scrollView,
            { paddingTop: 60 + insets.top + 20 },
          ]}
        >
          {/* Professional List Menu */}
          <View style={styles.listContainer}>
            {prefItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={styles.listItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.listIconContainer, { backgroundColor: item.bgColor }]}>
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={22}
                    color={item.iconColor}
                  />
                </View>
                <View style={styles.listTextContainer}>
                  <Text style={styles.listItemText}>{item.title}</Text>
                  <Text style={styles.listItemDesc}>{item.desc}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
                {index < prefItems.length - 1 && <View style={styles.divider} />}
              </TouchableOpacity>
            ))}
          </View>
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default Preferences;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginTop: 2,
  },
  scrollView: {
    gap: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  listContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 8,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    position: "relative",
  },
  listIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  listTextContainer: {
    flex: 1,
  },
  listItemText: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text.title,
    marginBottom: 2,
  },
  listItemDesc: {
    fontSize: 13,
    color: "#64748B",
  },
  divider: {
    position: "absolute",
    bottom: 0,
    left: 76,
    right: 16,
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  limitCardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 20,
  },
  limitCardHeader: {
    gap: 4,
  },
  limitCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text.title,
  },
  limitCardDesc: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 16,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  valueDisplay: {
    flex: 1,
    alignItems: "center",
  },
  valueText: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text.title,
  },
});
