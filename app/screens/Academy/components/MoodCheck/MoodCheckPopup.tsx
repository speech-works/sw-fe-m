import React, { useEffect } from "react";
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
import Angry1 from "../../../../assets/mood-check/Angry1";
import Calm1 from "../../../../assets/mood-check/Calm1";
import Happy1 from "../../../../assets/mood-check/Happy1";
import Sad1 from "../../../../assets/mood-check/Sad1";
import { getLocalTodayDateString } from "../../../../util/functions/date";
import Icon from "react-native-vector-icons/Feather";

const emotions = [
  {
    id: MoodType.ANGRY,
    name: "Angry",
    icon: Angry1,
    bgColor: theme.colors.moodcheck.angry,
  },
  {
    id: MoodType.CALM,
    name: "Calm",
    icon: Calm1,
    bgColor: theme.colors.moodcheck.calm,
  },
  {
    id: MoodType.HAPPY,
    name: "Happy",
    icon: Happy1,
    bgColor: theme.colors.moodcheck.happy,
  },
  {
    id: MoodType.SAD,
    name: "Sad",
    icon: Sad1,
    bgColor: theme.colors.moodcheck.sad,
  },
];

const MoodCheckPopup = () => {
  const { hasRecordedToday, lastPopupDate, setPopupShown } =
    useMoodCheckStore();
  const academyNavigation =
    useNavigation<AcademyStackNavigationProp<keyof AcademyStackParamList>>();
  const [visible, setVisible] = React.useState(false);

  useEffect(() => {
    const today = getLocalTodayDateString();

    // Show if:
    // 1. Not recorded today
    // 2. Popup hasn't been shown today
    if (!hasRecordedToday && lastPopupDate !== today) {
      // Small delay to ensure app is ready/layout is settled
      const timer = setTimeout(() => {
        setVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasRecordedToday, lastPopupDate]);

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
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleSkip} />
        <View style={styles.container}>
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
                style={[styles.card, { backgroundColor: emo.bgColor }]}
                onPress={() => handleSelectMood(emo.id)}
              >
                <emo.icon width={56} height={56} />
                <Text style={styles.moodName}>{emo.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
    backgroundColor: theme.colors.background.light,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border.default,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  skipText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
  },
  card: {
    width: (Dimensions.get("window").width - 48 - 16) / 2, // (Screen - padding - gap) / 2
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  moodName: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
});
