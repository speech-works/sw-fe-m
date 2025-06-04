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
export type Med = {
  name: string;
  desc: string;
  icon: string;
  musicUrl: string;
  voiceHover: string;
};

const meditationData: Med[] = [
  {
    name: "Morning Clarity",
    desc: "A gentle meditation to start your day with focus and positive energy",
    icon: "headphones",
    musicUrl:
      "https://www.chosic.com/wp-content/uploads/2024/08/Golden-Hour-chosic.com_.mp3",
    voiceHover: `Welcome to SpeechWorks.
                Let’s begin your session: Morning Clarity.
                Take a moment to settle into stillness.
                Close your eyes gently…
                Inhale deeply through your nose… and exhale slowly through your mouth.
                Feel your body waking up with each breath.
                As you breathe in, invite clarity and energy.
                As you breathe out, release any remnants of sleep or tension.
                Today is a blank canvas — full of possibility.
                Set a gentle intention for your day: peace, focus, gratitude…
                Let this breath guide your next step, calm and centered.`,
  },
  {
    name: "Evening Wind Down",
    desc: "A calming meditation to prepare your mind for a restful night’s sleep",
    icon: "moon",
    musicUrl:
      "https://www.chosic.com/wp-content/uploads/2022/02/Sunset-Landscape(chosic.com).mp3",
    voiceHover: `Welcome to SpeechWorks.
                This is your session: Evening Wind Down.
                Let your body begin to soften.
                Find stillness, whether you’re sitting or lying down.
                Close your eyes.
                Breathe in deeply…
                And let your breath fall gently out.
                With each breath, release the weight of your day.
                You did enough. You are enough.
                Allow your mind to drift.
                Let go of any lingering thoughts.
                Sink into the present… into rest.
                Feel yourself gently preparing for deep, peaceful sleep.`,
  },
  {
    name: "Stress Relief",
    desc: "A focused breathing practice to release tension and let go of stress",
    icon: "wind",
    musicUrl:
      "https://www.chosic.com/wp-content/uploads/2021/08/scott-buckley-jul(chosic.com).mp3",
    voiceHover: `Welcome to SpeechWorks.
                This is your session: Stress Relief.
                Wherever you are, pause.
                Place one hand over your heart… and one on your belly.
                Take a slow breath in… feel your belly rise.
                Now exhale through your mouth… feel the tension release.
                With each inhale, gather calm.
                With each exhale, let go of stress, worry, and tightness.
                Imagine a wave washing over you, clearing away what you don’t need.
                You are safe.
                You are grounded.
                You are here — in this breath, in this moment.`,
  },
  {
    name: "Mindful Breathing",
    desc: "A short breathing exercise to center your thoughts and bring calm",
    icon: "lungs",
    musicUrl:
      "https://www.chosic.com/wp-content/uploads/2022/10/scott-buckley-permafrost(chosic.com).mp3",
    voiceHover: `Welcome to SpeechWorks.
                Let’s begin your session: Mindful Breathing.
                Bring your attention to your breath.
                No need to change it — just observe.
                Inhale… and exhale.
                Notice the coolness of the air as it enters…
                The warmth as it leaves.
                If your mind wanders, that’s okay — gently return to your breath.
                With every breath, feel yourself become more centered.
                You are here.
                Fully present.
                Fully alive.`,
  },
  {
    name: "Body Scan",
    desc: "A guided scan through your entire body to release physical tension and increase awareness",
    icon: "user-alt",
    musicUrl:
      "https://www.chosic.com/wp-content/uploads/2024/04/Downpour-Sad-Dramatic-Music-chosic.com_.mp3",
    voiceHover: `Welcome to SpeechWorks.
                You’re now beginning Body Scan.
                Let’s journey through your body with awareness and kindness.
                Close your eyes and take a slow breath.
                Begin at the top of your head…
                Notice your scalp, your forehead… release any tension.
                Move down to your eyes, jaw, and neck… soften.
                Now your shoulders… let them drop.
                Feel into your chest… your arms… your fingertips.
                Scan down through your back, your stomach, your hips…
                Notice your legs… knees… feet… toes.
                With each breath, invite softness.
                Your body is your home.
                Let it rest and restore.`,
  },
  {
    name: "Guided Visualization",
    desc: "Use calming imagery to transport yourself to a peaceful, restorative environment",
    icon: "eye",
    musicUrl:
      "https://www.chosic.com/wp-content/uploads/2025/04/Shindao-chosic.com_.mp3",
    voiceHover: `Welcome to SpeechWorks.
                This is your session: Guided Visualization.
                Close your eyes and take a deep breath in… and out.
                Imagine yourself walking along a quiet forest path.
                The air is fresh. Sunlight filters through the leaves.
                You hear birdsong and the soft rustle of trees.
                With every step, you feel more relaxed… more free.
                Ahead, you see a peaceful clearing with a warm light.
                You sit or lie down here, safe and supported.
                Let the beauty of this inner world restore you.
                You can return here anytime…
                Just by breathing and remembering.`,
  },
  {
    name: "Fear Removal",
    desc: "A guided meditation drawing on proven fear-management imagery to dissolve fear and embrace life",
    icon: "shield-alt",
    musicUrl:
      "https://www.chosic.com/wp-content/uploads/2025/04/ReleaseFear-chosic.com_.mp3",
    voiceHover: `Welcome to SpeechWorks.
This is your session: Fear Removal.
Close your eyes and take a deep breath in… and exhale, letting your body settle.
Imagine yourself standing at the edge of a vast forest at dusk. The trees here represent fear—tall, dark, and tangled.
In your hand, you hold a glowing lantern. This lantern represents your inner courage and wisdom, drawn from every past moment you’ve faced uncertainty and moved forward.
With each inhale, imagine the lantern’s flame growing brighter—its light pushing back the shadows of those towering trees.
As you exhale, picture a soft breeze carrying away tendrils of doubt and worry, clearing a gentle path through the forest.
Begin to step forward onto that path. Notice how the light of your lantern reveals small, golden stones beneath your feet—stones of past successes, moments when you chose hope over hesitation.
Each step reminds you: fear is not a wall but a doorway. With every inhale, draw in confidence and trust. With every exhale, see the dark undergrowth of fear melt away, as sunlight filters through overhead branches.
Ahead, the path widens and opens into a clearing bathed in warm sunrise light—life waiting beyond fear. Hold your lantern high and step into that clearing, knowing this light resides within you always.
Now, keep moving forward along the forest path. Let your breath guide you deeper into calm and possibility.`,
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
