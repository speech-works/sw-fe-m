import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../../components/CustomScrollView";
import { theme } from "../../../../../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";

export type Exposure = {
  title: string;
  desc: string;
  icon: string;
  character: Array<string>;
};

const exposureData: Array<Exposure> = [
  {
    title: "Entry Level Interview",
    desc: "Practice a first job interview. Build confidence answering common questions.",
    icon: "user_icon_placeholder", // Based on the image, it looks like a generic user icon. You might want to replace this with an actual path/name if you have one.
    character: [
      "Eager to learn and contribute",
      "Focuses on potential and enthusiasm",
      "Highlights academic projects or volunteer work if applicable",
    ],
  },
  {
    title: "Creative Problem-Solving",
    desc: "Showcase your problem-solving in an interview. Practice explaining your approach clearly.",
    icon: "lightbulb_icon_placeholder", // Placeholder for a lightbulb or idea icon
    character: [
      "Thinks outside the box",
      "Breaks down complex problems",
      "Proposes innovative solutions",
    ],
  },
  {
    title: "Teamwork & Collaboration",
    desc: "Discuss teamwork experiences. Highlight your communication and collaboration skills.",
    icon: "group_icon_placeholder", // Placeholder for a group or team icon
    character: [
      "Works well with others",
      "Contributes positively to group dynamics",
      "Resolves conflicts constructively",
    ],
  },
  {
    title: "Leadership & Initiative",
    desc: "Practice scenarios where you demonstrate leadership qualities and take initiative.",
    icon: "star_icon_placeholder", // Placeholder for a star or leader icon
    character: [
      "Motivates and guides others",
      "Takes ownership of tasks",
      "Identifies opportunities for improvement",
    ],
  },
  {
    title: "Handling Failure & Learning",
    desc: "Prepare to discuss setbacks, what you learned, and how you adapted.",
    icon: "refresh_icon_placeholder", // Placeholder for a refresh or growth icon
    character: [
      "Resilient and adaptable",
      "Learns from mistakes",
      "Shows continuous self-improvement",
    ],
  },
  {
    title: "Technical Skills Showcase",
    desc: "Practice articulating your technical abilities and project contributions effectively.",
    icon: "code_icon_placeholder", // Placeholder for a code or gear icon
    character: [
      "Demonstrates relevant technical proficiency",
      "Explains complex concepts clearly",
      "Applies knowledge to practical problems",
    ],
  },
  {
    title: "Behavioral Questions Mastery",
    desc: "Refine your answers to common 'tell me about a time when...' questions using the STAR method.",
    icon: "chat_icon_placeholder", // Placeholder for a chat bubble or speech icon
    character: [
      "Provides structured and clear examples",
      "Connects experiences to required competencies",
      "Communicates effectively under pressure",
    ],
  },
  {
    title: "Company Culture Fit",
    desc: "Learn to align your values and aspirations with potential employers' organizational culture.",
    icon: "building_icon_placeholder", // Placeholder for a building or puzzle piece icon
    character: [
      "Researches company values thoroughly",
      "Expresses genuine interest in the culture",
      "Articulates how personal values align",
    ],
  },
  {
    title: "Negotiation Practice",
    desc: "Simulate salary and benefits discussions. Develop strategies for effective negotiation.",
    icon: "handshake_icon_placeholder", // Placeholder for a handshake or scale icon
    character: [
      "Assertive and confident communicator",
      "Researches market rates",
      "Seeks mutually beneficial outcomes",
    ],
  },
  {
    title: "Networking & Elevator Pitch",
    desc: "Craft and deliver a compelling elevator pitch. Practice professional networking scenarios.",
    icon: "network_icon_placeholder", // Placeholder for a network or person-with-lines icon
    character: [
      "Clear and concise communicator",
      "Engages confidently with new contacts",
      "Builds meaningful professional relationships",
    ],
  },
  {
    title: "Mock Presentation Skills",
    desc: "Practice delivering clear and engaging presentations, handling Q&A sessions effectively.",
    icon: "presentation_icon_placeholder", // Placeholder for a presentation board icon
    character: [
      "Delivers content with confidence",
      "Structures arguments logically",
      "Handles questions thoughtfully and professionally",
    ],
  },
];

interface ListOfInterviewsProps {
  onSelectInterview: (i: Exposure) => void;
}

const ListOfInterviews = ({ onSelectInterview }: ListOfInterviewsProps) => {
  return (
    <CustomScrollView contentContainerStyle={styles.container}>
      {exposureData.map((e) => (
        <TouchableOpacity
          key={e.title}
          style={styles.card}
          onPress={() => onSelectInterview(e)}
        >
          <View style={styles.content}>
            <Text style={styles.titleText}>{e.title}</Text>
            <Text style={styles.descText}>{e.desc}</Text>
          </View>
          <Icon
            name="chevron-right"
            size={16}
            color={theme.colors.text.default}
          />
        </TouchableOpacity>
      ))}
    </CustomScrollView>
  );
};

export default ListOfInterviews;

const styles = StyleSheet.create({
  container: {
    padding: SHADOW_BUFFER,
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 16,
  },
  card: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  content: {
    gap: 4,
    flexShrink: 1,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  descText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});
