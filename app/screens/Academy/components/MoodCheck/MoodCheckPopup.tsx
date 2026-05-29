import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MoodType } from "../../../../api/moodCheck/types";
import {
  ExploreStackNavigationProp,
  ExploreStackParamList,
} from "../../../../navigators/stacks/ExploreStack/types";
import { useMoodCheckStore } from "../../../../stores/mood";
import { theme } from "../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";

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

const SCREEN_HEIGHT = Dimensions.get("window").height;

const MoodCheckPopup = () => {
  const { hasRecordedToday, lastPopupDate, setPopupShown, _hasHydrated } =
    useMoodCheckStore();
  const exploreNavigation =
    useNavigation<ExploreStackNavigationProp<keyof ExploreStackParamList>>();
  const [visible, setVisible] = React.useState(false);
  const [canAnimate, setCanAnimate] = React.useState(false);

  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const [isMounted, setIsMounted] = React.useState(false);

  useEffect(() => {
    // Wait for hydration
    if (!_hasHydrated) {
      return;
    }

    const today = getLocalTodayDateString();

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

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCanAnimate(true);
      });
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsMounted(false);
        setCanAnimate(false);
      });
    }
  }, [visible]);

  const handleSkip = () => {
    setPopupShown(); // Mark as shown for today
    setVisible(false);
  };

  const handleSelectMood = (mood: MoodType) => {
    setVisible(false);
    setPopupShown();
    // @ts-ignore
    exploreNavigation.navigate("ExploreStack", {
      screen: "MoodCheckStack",
      params: {
        screen: "FollowUpStack",
        params: { mood },
      },
    });
  };

  if (!isMounted) return null;

  return (
    <Modal
      transparent
      visible={isMounted}
      animationType="none"
      onRequestClose={handleSkip}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.5)", opacity: opacityAnim },
          ]}
        >
          <Pressable style={{ flex: 1 }} onPress={handleSkip} />
        </Animated.View>
        <Animated.View
          style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
        >
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
            
            <TouchableOpacity onPress={handleSkip} style={styles.closeBtn}>
              <MaterialCommunityIcons
                name="close"
                size={18}
                color={theme.colors.library.gray[500]}
              />
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={styles.title}>How do you feel today?</Text>
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
                    <emo.icon
                      width={80}
                      height={80}
                      shouldAnimate={canAnimate}
                    />
                    <Text style={styles.moodName}>{emo.name}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default React.memo(MoodCheckPopup);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
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
    paddingHorizontal: 24,
    paddingTop: 54,
    paddingBottom: 50,
  },
  handle: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    width: 48,
    height: 6,
    backgroundColor: "rgba(0,0,0,0.1)", // Softer handle
    borderRadius: 3,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2), // Larger title
    color: theme.colors.library.orange[800],
    fontSize: 24,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
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
