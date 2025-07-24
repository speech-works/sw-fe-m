import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { theme } from "../../../../../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";
import { ExposurePractice } from "../../../../../../../api/dailyPractice/types";

interface ScenarioCardProps {
  onToggle: () => void;
  selectedScenario: ExposurePractice;
}

const ScenarioCard = ({ onToggle, selectedScenario }: ScenarioCardProps) => {
  return (
    <TouchableOpacity style={styles.metaCard} onPress={onToggle}>
      <View style={styles.contentContainer}>
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>{selectedScenario?.name}</Text>
        </View>
        <Text style={styles.descText}>{selectedScenario?.description}</Text>
        <View style={styles.cardFooter}>
          <Icon
            solid
            name={"gamepad"}
            size={16}
            color={theme.colors.actionPrimary.default}
          />
          <Text style={styles.levelText}>{selectedScenario.difficulty}</Text>
        </View>
      </View>
      <View style={styles.iconContainer}>
        <Icon
          name="chevron-right"
          size={16}
          color={theme.colors.text.default}
        />
      </View>
    </TouchableOpacity>
  );
};

export default ScenarioCard;

const styles = StyleSheet.create({
  metaCard: {
    ...parseShadowStyle(theme.shadow.elevation1),
    backgroundColor: theme.colors.surface.elevated,
    borderRadius: 16,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    gap: 24,
  },
  contentContainer: {
    gap: 16,
    flexShrink: 1,
  },
  iconContainer: {},
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  levelText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
  descText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
  cardFooter: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
});
