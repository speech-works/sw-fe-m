import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { theme } from "../../../../../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";
import BottomSheetModal from "../../../../../../../components/BottomSheetModal";
import CustomScrollView from "../../../../../../../components/CustomScrollView";

interface MeditationCardProps {
  onMedSelect: (med: Med) => void;
}
export type Med = { name: string; desc: string; icon: string };

const meditationData: Med[] = [
  {
    name: "Morning Clarity",
    desc: "A gentle meditation to start your day with focus and positive energy",
    icon: "headphones",
  },
  {
    name: "Evening Wind Down",
    desc: "A calming meditation to prepare your mind for a restful night’s sleep",
    icon: "moon",
  },
  {
    name: "Stress Relief",
    desc: "A focused breathing practice to release tension and let go of stress",
    icon: "wind",
  },
  {
    name: "Mindful Breathing",
    desc: "A short breathing exercise to center your thoughts and bring calm",
    icon: "lungs",
  },
  {
    name: "Body Scan",
    desc: "A guided scan through your entire body to release physical tension and increase awareness",
    icon: "user-alt",
  },
  {
    name: "Guided Visualization",
    desc: "Use calming imagery to transport yourself to a peaceful, restorative environment",
    icon: "eye",
  },
];

const MeditationCard = ({ onMedSelect }: MeditationCardProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Med>(meditationData[0]);
  const closeModal = () => setIsVisible(false);
  const showModal = () => setIsVisible(true);

  return (
    <>
      <TouchableOpacity style={styles.metaCard} onPress={showModal}>
        <View style={styles.contentContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.titleText}>{selectedMed.name}</Text>
            <Text style={styles.timeText}>10 mins</Text>
          </View>
          <Text style={styles.descText}>{selectedMed.desc}</Text>
          <View style={styles.cardFooter}>
            <Icon
              solid
              name={selectedMed.icon}
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

      <BottomSheetModal
        visible={isVisible}
        onClose={closeModal}
        maxHeight="80%"
      >
        <View style={styles.modalContent}>
          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalTiteText}>Meditation Library</Text>
            <Text style={styles.modalDescText}>
              Select a scenario to meditate in
            </Text>
          </View>

          {/* 
            • style={styles.scrollView} (flex:1) makes the scroll area fill all
              leftover vertical space inside modalContent.
            • nestedScrollEnabled=true ensures inner scrolling “wins”
          */}
          <CustomScrollView
            style={styles.scrollView}
            nestedScrollEnabled={true}
            contentContainerStyle={styles.scrollContainer}
          >
            {meditationData.map((med, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.medCard,
                  selectedMed.name === med.name && styles.selectedMedCard,
                ]}
                onPress={() => {
                  onMedSelect(med);
                  setSelectedMed(med);
                  closeModal();
                }}
              >
                <View
                  style={[styles.medIconContainer, styles.medIconContainer2]}
                >
                  <Icon
                    solid
                    name={med.icon}
                    size={24}
                    color={theme.colors.actionPrimary.default}
                  />
                </View>
                <View style={styles.medDescContainer}>
                  <Text
                    style={[
                      styles.medNameText,
                      selectedMed.name === med.name && styles.selectedCardText,
                    ]}
                  >
                    {med.name}
                  </Text>
                  <Text
                    style={[
                      styles.medDetailText,
                      selectedMed.name === med.name && styles.selectedCardText,
                    ]}
                  >
                    {med.desc}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </CustomScrollView>
        </View>
      </BottomSheetModal>
    </>
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

  modalContent: {
    paddingVertical: 24,
    width: "100%",
    flex: 1, // ← valid because the parent Animated.View has a fixed height
    flexDirection: "column",
    gap: 32,
  },
  scrollView: {
    flex: 1, // ← forces ScrollView to fill all vertical space under the title
  },
  scrollContainer: {
    gap: 16,
    alignItems: "center",
    // NO flex:1 here—let content size itself
  },

  medCard: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  selectedMedCard: {
    backgroundColor: theme.colors.actionPrimary.default,
  },
  selectedCardText: {
    color: theme.colors.text.onDark,
    fontWeight: "600",
  },
  medIconContainer: {
    height: 40,
    width: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: theme.colors.surface.default,
  },
  medIconContainer2: {
    height: 40,
    width: 40,
  },
  medDescContainer: {
    gap: 4,
    flexShrink: 1,
  },
  medNameText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  medDetailText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },

  modalTitleContainer: {
    gap: 12,
    alignItems: "center",
  },
  modalTiteText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  modalDescText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});
