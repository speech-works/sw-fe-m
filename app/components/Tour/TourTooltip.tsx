import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  DeviceEventEmitter,
  Dimensions,
  ScrollView,
} from "react-native";
import { TooltipProps } from "rn-tourguide";
import { theme } from "../../Theme/tokens";
import {
  parseTextStyle,
  parseShadowStyle,
} from "../../util/functions/parseStyles";
import Icon from "react-native-vector-icons/Feather";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const TourTooltip = ({
  isFirstStep,
  isLastStep,
  handleNext,
  handlePrev,
  handleStop,
  currentStep,
  labels,
}: TooltipProps) => {
  const onNextPress = () => {
    if (isLastStep) {
      handleStop?.();
    } else {
      DeviceEventEmitter.emit("tour:next", { currentStep, handleNext });
    }
  };

  const onPrevPress = () => {
    DeviceEventEmitter.emit("tour:prev", { currentStep, handlePrev });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {currentStep && (
          <>
            <View style={styles.header}>
              <View style={styles.chip}>
                <Icon name="info" size={12} color="white" />
                <Text style={styles.chipText}>App Tour</Text>
              </View>
              <Text style={styles.progressText}>Step {currentStep.order}</Text>
            </View>
            <Text style={styles.title}>{currentStep.text}</Text>
          </>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleStop} style={styles.skipButton}>
          <Text style={styles.skipText}>{labels?.skip || "Skip"}</Text>
        </TouchableOpacity>
        <View style={styles.actions}>
          {!isFirstStep && (
            <TouchableOpacity onPress={onPrevPress} style={styles.backButton}>
              <Text style={styles.backText}>{labels?.previous || "Back"}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onNextPress} style={styles.nextButton}>
            <Text style={styles.nextText}>
              {isLastStep ? labels?.finish || "Got it" : labels?.next || "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    width: 300,
    maxWidth: SCREEN_WIDTH - 32,
    maxHeight: SCREEN_HEIGHT * 0.45,
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  content: {
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.actionPrimary.default || "#0EA5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  chipText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  progressText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.disabled,
    fontWeight: "600",
  },
  title: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  skipButton: {
    paddingVertical: 8,
  },
  skipText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.disabled,
    fontWeight: "600",
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    fontWeight: "600",
  },
  nextButton: {
    backgroundColor: theme.colors.actionPrimary.default || "#0EA5E9",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  nextText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "white",
    fontWeight: "700",
  },
});

export default TourTooltip;
