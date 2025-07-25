import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import ScreenView from "../../../../../../components/ScreenView";
import CustomScrollView from "../../../../../../components/CustomScrollView";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";
import { useNavigation } from "@react-navigation/native";
import {
  CharacterVoiceFDPStackNavigationProp,
  CharacterVoiceFDPStackParamList,
} from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/FunPracticeStack/CharacterVoicePracticeStack/types";
import { getFunPracticeByType } from "../../../../../../api/dailyPractice";
import {
  FunPractice,
  FunPracticeType,
} from "../../../../../../api/dailyPractice/types";

const CharacterVoice = () => {
  const [cvList, setcvList] = useState<FunPractice[]>([]);

  useEffect(() => {
    const fetchVoices = async () => {
      const cvl = await getFunPracticeByType(FunPracticeType.CHARACTER_VOICE);
      setcvList(cvl);
    };
    fetchVoices();
  }, []);

  const navigation =
    useNavigation<
      CharacterVoiceFDPStackNavigationProp<
        keyof CharacterVoiceFDPStackParamList
      >
    >();
  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.topNavigation}
          onPress={() => navigation.goBack()}
        >
          <Icon
            name="chevron-left"
            size={16}
            color={theme.colors.text.default}
          />
          <Text style={styles.topNavigationText}>Character Voice</Text>
        </TouchableOpacity>
        <CustomScrollView>
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Icon
                size={24}
                name="microphone"
                color={theme.colors.library.purple[400]}
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.titleText}>Choose Your Voice</Text>
              <Text style={styles.descText}>
                Select a fun character voice to try!
              </Text>
            </View>
            <View style={styles.cvList}>
              {cvList.map((cv, i) => (
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate("CVExercise", {
                      id: cv.id,
                      name: cv.name,
                      cvData: cv.characterVoiceData!,
                    });
                  }}
                  key={i}
                  style={[
                    styles.cvCard,
                    {
                      backgroundColor: theme.colors.library.purple[100],
                    },
                  ]}
                >
                  <View style={styles.cvCardLeft}>
                    <Icon
                      name={cv.characterVoiceData?.icon!}
                      size={16}
                      color={theme.colors.library.purple[400]}
                    />
                    <Text style={styles.cvText}>{cv.name}</Text>
                  </View>
                  <Icon
                    name="chevron-right"
                    size={16}
                    color={theme.colors.text.default}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default CharacterVoice;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
  },
  topNavigation: {
    position: "relative",
    top: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topNavigationText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  card: {
    alignItems: "center",
    gap: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderRadius: 16,
    padding: 14,
  },
  iconContainer: {
    height: 64,
    width: 64,
    borderRadius: "50%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.library.purple[100],
  },
  textContainer: {
    gap: 12,
    alignItems: "center",
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
  },
  descText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  cvList: {
    gap: 12,
  },
  cvCard: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
  },
  cvCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cvText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});
