import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { theme } from "../../../../../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";
import { CognitivePractice } from "../../../../../../../api/dailyPractice/types";

interface MeditationCardProps {
  onMedToggle: () => void;
  selectedMed: CognitivePractice;
}

const MeditationCard = ({ onMedToggle, selectedMed }: MeditationCardProps) => {
  return (
    <TouchableOpacity style={styles.metaCard} onPress={onMedToggle}>
      <View style={styles.contentContainer}>
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>{selectedMed?.name}</Text>
          <Text style={styles.timeText}>
            {selectedMed?.guidedMeditationData?.durationMinutes} mins
          </Text>
        </View>
        <Text style={styles.descText}>{selectedMed?.description}</Text>
        <View style={styles.cardFooter}>
          <Icon
            solid
            name={"headphones"}
            size={16}
            color={theme.colors.actionPrimary.default}
          />
          <Text style={styles.footerText}>Voice guided</Text>
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

export default MeditationCard;

const styles = StyleSheet.create({
  metaCard: {
    ...parseShadowStyle(theme.shadow.elevation1),
    backgroundColor: theme.colors.surface.elevated,
    borderRadius: 16,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
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
  timeText: {
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
  footerText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
});
