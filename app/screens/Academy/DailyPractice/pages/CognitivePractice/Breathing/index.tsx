import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import ScreenView from "../../../../../../components/ScreenView";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../../Theme/tokens";
import { useNavigation } from "@react-navigation/native";
import { parseTextStyle } from "../../../../../../util/functions/parseStyles";
import { BreathingHalo } from "./components/BreathingHalo";

import ProgressBar from "../../../../../../components/ProgressBar";
import Button from "../../../../../../components/Button";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";

const Breathing = () => {
  const navigation = useNavigation();
  const [mute, setMute] = React.useState(false);
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
            <Text style={styles.topNavigationText}>Breathing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setMute(!mute);
            }}
          >
            <Icon
              name={mute ? "volume-mute" : "volume-up"}
              size={16}
              color={theme.colors.actionPrimary.default}
            />
          </TouchableOpacity>
        </View>
        <CustomScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.haloContainer}>
            <BreathingHalo
              mute={mute}
              inhale={4}
              hold={4}
              exhale={4}
              repeat
              //onCycleComplete={() => {}}
            />
          </View>
          <View style={styles.tipsContainer}>
            <View style={styles.tipTitleContainer}>
              <Icon
                solid
                name="lightbulb"
                size={16}
                color={theme.colors.text.title}
              />
              <Text style={styles.tipTitleText}>Practice Tips</Text>
            </View>
            <View style={styles.tipListContainer}>
              <View style={styles.tipCard}>
                <Icon
                  solid
                  name="lungs"
                  size={16}
                  color={theme.colors.library.orange[400]}
                />
                <Text style={styles.tipText}>
                  Take deep breaths before starting. Feel your diaphragm expand.
                </Text>
              </View>
              <View style={styles.tipCard}>
                <Icon
                  solid
                  name="smile"
                  size={16}
                  color={theme.colors.library.green[400]}
                />
                <Text style={styles.tipText}>
                  Maintain a relaxed facial posture. Release jaw tension.
                </Text>
              </View>
              <View style={styles.tipCard}>
                <Icon
                  solid
                  name="wind"
                  size={16}
                  color={theme.colors.library.blue[400]}
                />
                <Text style={styles.tipText}>
                  It's okay to take your time. Focus on smooth transitions.
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressTitle}>
              <Text style={styles.progressTitleText}>Session Progress</Text>
              <Text style={styles.progressDescText}>2/5 minutes</Text>
            </View>
            <ProgressBar
              currentStep={2}
              totalSteps={5}
              showStepIndicator={false}
              showPercentage={false}
            />
          </View>
          <Button text="Start Exercise" onPress={() => {}} />
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default Breathing;

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
  haloContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 36,
  },
  tipsContainer: {
    padding: 16,
    gap: 16,
  },
  tipTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tipTitleText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.title,
  },
  tipListContainer: {
    gap: 12,
  },
  tipCard: {
    backgroundColor: theme.colors.surface.elevated,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tipText: {
    flexShrink: 1,
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  progressContainer: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    padding: 24,
    gap: 16,
  },

  progressTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  progressDescText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
});
