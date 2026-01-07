import React, { useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { theme } from "../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";
import { useMoodCheckStore } from "../../../../stores/mood";
import { useNavigation } from "@react-navigation/native";
import {
  AcademyStackNavigationProp,
  AcademyStackParamList,
} from "../../../../navigators/stacks/AcademyStack/types";
import { MoodType } from "../../../../api/moodCheck/types";

// Animated Faces
import AngryFace from "../../../../assets/mood-check/AngryFace";
import CalmFace from "../../../../assets/mood-check/CalmFace";
import HappyFace from "../../../../assets/mood-check/HappyFace";
import SadFace from "../../../../assets/mood-check/SadFace";

import { getLocalTodayDateString } from "../../../../util/functions/date";

const emotions = [
  {
    id: MoodType.ANGRY,
    name: "Angry",
    icon: AngryFace,
    tint: theme.colors.moodcheck.angry, // #FFF1F2 (Soft Red)
    border: "#FECACA", // Red 200
  },
  {
    id: MoodType.CALM,
    name: "Calm",
    icon: CalmFace,
    tint: theme.colors.moodcheck.calm, // #ECFDF5 (Soft Mint)
    border: "#A7F3D0", // Green 200
  },
  {
    id: MoodType.HAPPY,
    name: "Happy",
    icon: HappyFace,
    tint: theme.colors.moodcheck.happy, // #FFF7ED (Soft Orange)
    border: "#FED7AA", // Orange 200
  },
  {
    id: MoodType.SAD,
    name: "Sad",
    icon: SadFace,
    tint: theme.colors.moodcheck.sad, // #EFF6FF (Soft Blue)
    border: "#BFDBFE", // Blue 200
  },
];

const MoodCheckPopup = () => {
  const { hasRecordedToday, lastPopupDate, setPopupShown, _hasHydrated } =
    useMoodCheckStore();
  const academyNavigation =
    useNavigation<AcademyStackNavigationProp<keyof AcademyStackParamList>>();
  const [visible, setVisible] = React.useState(false);

  useEffect(() => {
    // Wait for hydration
    if (!_hasHydrated) {
      console.log("MoodCheck - Waiting for Hydration");
      return;
    }

    const today = getLocalTodayDateString();

    console.log("MoodCheck Check:", {
      _hasHydrated,
      hasRecordedToday,
      lastPopupDate,
      today,
      shouldShow: !hasRecordedToday && lastPopupDate !== today,
    });

    // Show if:
    // 1. Not recorded today
    // 2. Popup hasn't been shown today
    if (!hasRecordedToday && lastPopupDate !== today) {
      const timer = setTimeout(() => {
        setVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasRecordedToday, lastPopupDate, _hasHydrated]);

  const handleSkip = () => {
    setPopupShown(); // Mark as shown for today
    setVisible(false);
  };

  const handleSelectMood = (mood: MoodType) => {
    setVisible(false);
    setPopupShown();
    // @ts-ignore
    academyNavigation.navigate("AcademyStack", {
      screen: "MoodCheckStack",
      params: {
        screen: "FollowUpStack",
        params: { mood },
      },
    });
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={handleSkip}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleSkip} />
        <View style={styles.container}>
          <LinearGradient
            colors={[
              theme.colors.library.orange[100],
              theme.colors.library.orange[200],
            ]}
            style={styles.gradientContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>How do you feel today?</Text>
              <TouchableOpacity onPress={handleSkip} hitSlop={10}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.grid}>
              {emotions.map((emo) => (
                <TouchableOpacity
                  key={emo.id}
                  activeOpacity={0.8}
                  onPress={() => handleSelectMood(emo.id)}
                  style={styles.cardWrapper}
                >
                  <LinearGradient
                    // Pearlescent Gradient: White -> Tint
                    colors={["#FFFFFF", emo.tint]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.card, { borderColor: emo.border }]}
                  >
                    <emo.icon width={80} height={80} shouldAnimate={true} />
                    <Text style={styles.moodName}>{emo.name}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

export default MoodCheckPopup;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: "transparent",
    borderTopLeftRadius: 32, // More curve
    borderTopRightRadius: 32,
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  gradientContainer: {
    padding: 24,
    paddingBottom: 50,
  },
  handle: {
    width: 48,
    height: 6,
    backgroundColor: "rgba(0,0,0,0.1)", // Softer handle
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2), // Larger title
    color: theme.colors.library.orange[800],
    fontSize: 24,
  },
  skipText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.library.gray[500],
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
  },
  cardWrapper: {
    width: (Dimensions.get("window").width - 48 - 16) / 2,
    aspectRatio: 1,
    // ...parseShadowStyle(theme.shadow.elevation1), // Shadow removed as requested
  },
  card: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  moodName: {
    ...parseTextStyle(theme.typography.Body),
    fontWeight: "600",
    color: theme.colors.library.gray[700],
    marginTop: 4,
  },
});
