import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";
import {
  SCEDPStackParamList,
  SCEDPStackNavigationProp,
} from "../../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ExposureStack/SocialChallengeStack/types";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import Button from "../../../../../../../components/Button";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../../components/ScreenView";
import { useSessionStore } from "../../../../../../../stores/session";
import {
  createPracticeActivity,
  startPracticeActivity,
} from "../../../../../../../api";
import { PracticeActivityContentType } from "../../../../../../../api/practiceActivities/types";
import { useActivityStore } from "../../../../../../../stores/activity";

const Briefing = () => {
  const { practiceSession } = useSessionStore();
  const { addActivity } = useActivityStore();
  const navigation =
    useNavigation<SCEDPStackNavigationProp<keyof SCEDPStackParamList>>();
  const route = useRoute<RouteProp<SCEDPStackParamList, "SCBriefing">>();
  const { sc } = route.params;
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null
  );

  const markActivityStart = async () => {
    if (!practiceSession) return;
    const newActivity = await createPracticeActivity({
      sessionId: practiceSession.id,
      contentType: PracticeActivityContentType.EXPOSURE_PRACTICE,
      contentId: sc.id,
    });
    const startedActivity = await startPracticeActivity({
      id: newActivity.id,
      userId: practiceSession.user.id,
    });
    addActivity({
      ...startedActivity,
    });
    setCurrentActivityId(newActivity.id);
  };

  useEffect(() => {
    console.log("Begin Challenge", { currentActivityId });
    currentActivityId &&
      navigation.navigate("SCChat", {
        sc,
        practiceActivityId: currentActivityId,
      });
  }, [currentActivityId]);

  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        <View style={styles.topNavigationContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.topNavigation}
          >
            <Icon
              name="chevron-left"
              size={16}
              color={theme.colors.text.default}
            />
            <Text style={styles.topNavigationText}>Social Challenge</Text>
          </TouchableOpacity>
        </View>
        <CustomScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.innerContainer}>
            <View style={styles.briefContainer}>
              <View style={styles.iconContainer}>
                <Icon
                  size={24}
                  name={
                    sc.practiceData?.scenario.availableRole.fontAwesomeIcon ||
                    "user-tie"
                  }
                  color={theme.colors.library.blue[400]}
                />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.titleText}>{sc.name}</Text>
                <Text style={styles.descText}>{sc.description}</Text>
              </View>
            </View>
            <View style={styles.characterContainer}>
              <Text style={styles.characterTitleText}>Your Character</Text>
              {sc.practiceData?.stage.userCharacter.map((c, i) => (
                <View key={i} style={styles.characterRow}>
                  <Icon
                    solid
                    size={14}
                    name="check-circle"
                    color={theme.colors.library.orange[400]}
                  />
                  <Text style={styles.characterText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
          <Button text="Begin Challenge" onPress={markActivityStart} />
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default Briefing;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
  },
  scrollContainer: {
    gap: 32,
    padding: SHADOW_BUFFER,
  },
  topNavigationContainer: {
    position: "relative",
    top: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topNavigation: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topNavigationText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  innerContainer: {
    padding: 24,
    gap: 24,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
    //shadowOpacity: 1,
  },
  briefContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  iconContainer: {
    height: 64,
    width: 64,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "50%",
    backgroundColor: theme.colors.library.blue[100],
  },
  textContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    textAlign: "center",
  },
  descText: {
    textAlign: "center",
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  characterContainer: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
    backgroundColor: theme.colors.surface.default,
  },
  characterTitleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  characterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  characterText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    flexShrink: 1,
  },
});
