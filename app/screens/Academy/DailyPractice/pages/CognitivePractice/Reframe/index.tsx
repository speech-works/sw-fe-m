import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import ScreenView from "../../../../../../components/ScreenView";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";
import { theme } from "../../../../../../Theme/tokens";
import { useNavigation } from "@react-navigation/native";
import {
  CDPStackNavigationProp,
  CDPStackParamList,
} from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/CognitivePracticeStack/types";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import TextArea from "../../../../../../components/TextArea";
import Button from "../../../../../../components/Button";
import {
  AcademyStackNavigationProp,
  AcademyStackParamList,
} from "../../../../../../navigators/stacks/AcademyStack/types";

const reframeData = [
  "I'm working on my public speaking skills and improving every day",
  "My worth isn't determined by my fluency, and I can communicate effectively",
  "Many successful people stutter, and I can be successful too",
];

const Reframe = () => {
  const navigation =
    useNavigation<CDPStackNavigationProp<keyof CDPStackParamList>>();
  const academyNav =
    useNavigation<AcademyStackNavigationProp<keyof AcademyStackParamList>>();
  const [selectedReframe, setSelectedReframe] = React.useState<string | null>(
    null
  );
  const [writtenReframe, setWrittenReframe] = React.useState<string>("");
  const onBackPress = () => {
    navigation.goBack();
  };
  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.topNavigation} onPress={onBackPress}>
          <Icon name="arrow-left" size={16} color={theme.colors.text.default} />
          <Text style={styles.topNavigationText}>Reframe Thoughts</Text>
        </TouchableOpacity>
        <CustomScrollView contentContainerStyle={styles.scrollView}>
          <View style={styles.negativeContainer}>
            <View style={styles.negativeTextContainer}>
              <Text style={styles.negativeTitleText}>
                Current Negative Thought
              </Text>
              <View style={styles.negativeBox}>
                <Text style={styles.negativeText}>
                  I'll never be able to speak fluently in public
                </Text>
              </View>
            </View>
            <View style={styles.ideaContainer}>
              <Icon
                solid
                size={14}
                name="lightbulb"
                color={theme.colors.library.blue[400]}
              />
              <Text style={styles.ideaText}>
                Let's transform this thought into something more empowering
              </Text>
            </View>
          </View>
          <View style={styles.positiveContainer}>
            <Text style={styles.positiveTitleText}>
              Choose a Positive Reframe
            </Text>
            <View style={styles.reframeListContainer}>
              {reframeData.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.reframeTextBox}
                  onPress={() => {
                    setSelectedReframe(item);
                  }}
                >
                  <View
                    style={[
                      styles.selectIconContainer,
                      selectedReframe === item && styles.selectedIconContainer,
                    ]}
                  >
                    {selectedReframe === item && (
                      <Icon
                        solid
                        name="check"
                        size={12}
                        color={theme.colors.text.onDark}
                      />
                    )}
                  </View>
                  <Text style={styles.reframeText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.writeContainer}>
              <Text style={styles.writeTitleText}>Write Your Own Reframe</Text>
              <View style={styles.textFieldContainer}>
                <TextArea
                  value={writtenReframe}
                  onChangeText={setWrittenReframe}
                  placeholder="Type your positive perspective here..."
                  numberOfLines={5}
                  containerStyle={styles.textAreaContainer}
                  inputStyle={styles.textAreaInput}
                />
              </View>
            </View>
          </View>
          <View style={styles.btnContainer}>
            <Button text="Next Reframe" onPress={() => {}} />
            <Button
              variant="ghost"
              text="Home"
              onPress={() => {
                academyNav.navigate("Academy");
              }}
              style={{
                backgroundColor: theme.colors.surface.elevated,
                borderColor: "transparent",
              }}
            />
          </View>
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default Reframe;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
  },
  scrollContainer: { gap: 32 },
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
  scrollView: {
    gap: 32,
    padding: SHADOW_BUFFER,
  },
  negativeContainer: {
    padding: 24,
    gap: 16,
    backgroundColor: theme.colors.surface.elevated,
    borderRadius: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  negativeTextContainer: {
    gap: 12,
  },
  negativeTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  negativeBox: {
    padding: 16,
    backgroundColor: theme.colors.surface.default,
    borderRadius: 16,
  },
  negativeText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  ideaContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  ideaText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  positiveContainer: {
    gap: 20,
  },
  positiveTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  reframeListContainer: {
    gap: 16,
  },
  reframeTextBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: theme.colors.surface.elevated,
    borderRadius: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  reframeText: {
    flexShrink: 1,
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  selectIconContainer: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedIconContainer: {
    backgroundColor: theme.colors.library.orange[400],
    borderColor: "transparent",
  },
  writeContainer: {
    padding: 24,
    gap: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  writeTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  textFieldContainer: {
    display: "flex",
    flex: 1,
    borderRadius: 12,
    backgroundColor: theme.colors.background.default,
  },
  textAreaContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  textAreaInput: {
    minHeight: 50,
    backgroundColor: theme.colors.background.default,
    ...parseTextStyle(theme.typography.BodySmall),
  },

  btnContainer: {
    gap: 12,
    paddingBottom: 32,
  },
});
