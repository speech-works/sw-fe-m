import { ImageBackground, StyleSheet, Text, View } from "react-native";
import React, { useEffect, useState } from "react";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import { theme } from "../../../../../Theme/tokens";
import { getTutorialByTechnique } from "../../../../../api/library";
import { TECHNIQUES_ENUM, Tutorial } from "../../../../../api/library/types";
import Icon from "react-native-vector-icons/FontAwesome5";
import Button from "../../../../../components/Button";

interface TutorialPageProps {
  techniqueId: TECHNIQUES_ENUM;
  setActiveStageIndex: React.Dispatch<React.SetStateAction<number>>;
}

const TutorialPage = ({
  techniqueId,
  setActiveStageIndex,
}: TutorialPageProps) => {
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);

  useEffect(() => {
    const fetchTutorial = async () => {
      const tut = await getTutorialByTechnique(techniqueId);
      setTutorial(tut);
    };
    fetchTutorial();
  }, []);

  return (
    <View style={styles.innerContainer}>
      <ImageBackground
        source={require("../../../../../assets/demo-tut-img.png")}
        style={styles.videoContainer}
        imageStyle={styles.imgStyle}
      >
        <View style={styles.videoMeta}>
          <Text style={styles.videoMetaTitleText}>{tutorial?.title}</Text>
          <Text style={styles.videoMetaDescText}>Duration: 3:45</Text>
        </View>
      </ImageBackground>
      <View style={styles.learningPathContainer}>
        <Text style={styles.learningPathTitleText}>Your Learning Path</Text>
        <View style={styles.learningPathObjectives}>
          {tutorial?.learningPath.map((o, i) => (
            <View key={i} style={styles.objective}>
              <Icon
                solid
                name="check-circle"
                size={14}
                color={theme.colors.actionPrimary.default}
              />
              <Text style={styles.objectiveText}>{o}</Text>
            </View>
          ))}
        </View>
      </View>
      <Button
        text="Begin Practice Session"
        onPress={() => {
          setActiveStageIndex(1);
        }}
      />
    </View>
  );
};

export default TutorialPage;

const styles = StyleSheet.create({
  innerContainer: {
    gap: 16,
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
  videoContainer: {
    height: 420,
    width: "100%",
    borderRadius: 16,
    //backgroundColor: theme.colors.background.default,
    position: "relative",
  },
  imgStyle: {
    borderRadius: 16,
  },
  videoMeta: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 16,
    backgroundColor: "black",
    opacity: 0.8,
    borderBottomEndRadius: 16,
    borderBottomStartRadius: 16,
  },
  videoMetaTitleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.onDark,
  },
  videoMetaDescText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  learningPathContainer: {
    padding: 16,
    gap: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.background.default,
  },
  learningPathTitleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  learningPathObjectives: {
    gap: 12,
  },
  objective: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  objectiveText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});
