import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useState } from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import BottomSheetModal from "../../../../../components/BottomSheetModal"; // update the path as needed

interface SpeechToolsProps {
  onToolSelect?: (toolName: string) => void;
}

const SpeechTools = ({ onToolSelect }: SpeechToolsProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const closeModal = () => {
    setIsVisible(false);
  };

  const toolData: Array<{
    name: string;
    desc: string;
    icon: string;
    disabled?: boolean;
  }> = [
    { name: "Metronome", desc: "Pace your speech with a beat", icon: "clock" },

    {
      name: "Voicehover",
      desc: "Read along with a guide voice",
      icon: "volume-down",
    },

    {
      name: "Chorus",
      desc: "Read along with the group",
      icon: "users",
      disabled: true,
    },
    {
      name: "DAF",
      desc: "Hear your voice with a slight delay",
      icon: "headphones",
      disabled: true,
    },
  ];

  return (
    <React.Fragment>
      <TouchableOpacity
        style={styles.toolsContainer}
        onPress={() => {
          setIsVisible(true);
        }}
      >
        <View style={styles.content}>
          <View style={styles.toolIconContainer}>
            <Icon
              name="toolbox"
              size={16}
              color={theme.colors.actionPrimary.default}
            />
          </View>
          <View style={styles.toolTextContainer}>
            <Text style={styles.toolTitleText}>Speech Tools</Text>
            <Text style={styles.toolDescText}>
              Add tools to aid your practice
            </Text>
          </View>
        </View>
        <Icon
          name="chevron-right"
          size={16}
          color={theme.colors.text.default}
        />
      </TouchableOpacity>

      <BottomSheetModal visible={isVisible} onClose={closeModal}>
        <View style={styles.modalContent}>
          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalTiteText}>Speech Tools</Text>
            <Text style={styles.modalDescText}>
              Select a tool to help guide your speech
            </Text>
          </View>
          <View style={styles.toolsListContanier}>
            {toolData.map((tool, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.toolCard,
                  selectedTool === tool.name && styles.selectedToolCard,
                  tool.disabled && styles.disabledCard,
                ]}
                disabled={tool.disabled}
                onPress={() => {
                  if (tool.disabled) return;
                  onToolSelect?.(tool.name);
                  setSelectedTool(tool.name);
                  closeModal();
                }}
              >
                <View
                  style={[
                    styles.toolIconContainer,
                    styles.toolIconContainer2,
                    tool.disabled ? styles.disabledIconContainer : null,
                  ]}
                >
                  <Icon
                    solid
                    name={tool.icon}
                    size={24}
                    color={
                      tool.disabled
                        ? theme.colors.library.gray[100]
                        : theme.colors.actionPrimary.default
                    }
                  />
                </View>
                <View style={styles.toolDescContainer}>
                  <Text
                    style={[
                      styles.toolNameText,
                      tool.disabled && styles.disabledText,
                      selectedTool === tool.name &&
                        !tool.disabled &&
                        styles.selectedCardText,
                    ]}
                  >
                    {tool.name}
                  </Text>
                  <Text
                    style={[
                      styles.toolDetailText,
                      tool.disabled && styles.disabledText,
                      selectedTool === tool.name &&
                        !tool.disabled &&
                        styles.selectedCardText,
                    ]}
                  >
                    {tool.disabled ? "coming soon" : tool.desc}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </BottomSheetModal>
    </React.Fragment>
  );
};

export default SpeechTools;

const styles = StyleSheet.create({
  toolsContainer: {
    padding: 16,
    borderRadius: 16,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  content: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toolTextContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  toolTitleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  toolDescText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  toolIconContainer: {
    height: 40,
    width: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: theme.colors.surface.default,
  },
  modalContent: {
    paddingVertical: 24,
    width: "100%",
    gap: 32,
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
  toolsListContanier: {
    gap: 16,
    alignItems: "center",
    width: "100%",
  },
  toolCard: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  disabledCard: {
    backgroundColor: theme.colors.surface.disabled,
    opacity: 1,
    elevation: 0, // Android
    shadowColor: "transparent", // iOS
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  disabledText: {
    color: theme.colors.text.disabled,
  },
  selectedToolCard: {
    backgroundColor: theme.colors.actionPrimary.default,
  },
  selectedCardText: {
    color: theme.colors.text.onDark,
    fontWeight: "600",
  },
  toolIconContainer2: {
    height: 40,
    width: 40,
  },
  disabledIconContainer: {
    backgroundColor: theme.colors.library.gray[200],
  },
  toolDescContainer: {
    gap: 4,
  },
  toolNameText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  toolDetailText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
});
