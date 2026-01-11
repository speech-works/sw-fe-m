import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import React, { useState } from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import {
  TransformedTechnique,
  TECHNIQUE_LEVEL_ENUM,
} from "../../../../../api/library/types";
import TechniqueCard from "../TechniqueCard";
import { LinearGradient } from "expo-linear-gradient";
import BottomSheetModal from "../../../../../components/BottomSheetModal";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface LibrarySectionProps {
  sectionId?: string;
  title: string;
  subtitle: string;
  aboutText: string;
  techniques: Array<TransformedTechnique>;
  isPaidUser?: boolean;
  onTechniqueSelect: (tech: TransformedTechnique) => void;
}

const LibrarySection = ({
  sectionId,
  title,
  subtitle,
  aboutText,
  techniques,
  isPaidUser,
  onTechniqueSelect,
}: LibrarySectionProps) => {
  const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);

  // Bento Logic:
  const isUnderstanding = sectionId === "UNDERSTANDING";

  // Icon mapping for header
  const getHeaderIcon = () => {
    switch (sectionId) {
      case "UNDERSTANDING":
        return "brain";
      case "MODIFICATION":
        return "tools";
      case "FLUENCY":
        return "feather";
      case "RELAXATION":
        return "spa";
      default:
        return "lightbulb";
    }
  };

  if (techniques.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Watermark - subtle background icon */}
      <View style={styles.watermarkContainer} pointerEvents="none">
        <Icon
          name={
            isUnderstanding
              ? "brain"
              : sectionId === "MODIFICATION"
              ? "tools"
              : "feather"
          }
          size={120}
          color={theme.colors.library.gray[200]}
          style={{ opacity: 0.15, transform: [{ rotate: "-15deg" }] }}
        />
      </View>

      {/* --- Minimal Header --- */}
      <View style={styles.header}>
        {/* Title Column */}
        <View style={styles.titleColumn}>
          {subtitle && (
            <View style={styles.subtitlePill}>
              <Text style={styles.subtitleText}>{subtitle}</Text>
            </View>
          )}

          <View style={styles.mainTitleRow}>
            {/* Soft Icon Circle */}
            <LinearGradient
              colors={["#FFF7ED", "#FFEDD5"]} // Very subtle orange wash
              style={styles.iconCircle}
            >
              <Icon
                name={getHeaderIcon()}
                size={18}
                color={theme.colors.library.orange[500]}
              />
            </LinearGradient>

            <Text style={styles.title}>{title}</Text>

            {/* Info Icon Toggle - Opens Modal */}
            <TouchableOpacity
              onPress={() => setIsInfoModalVisible(true)}
              style={styles.infoIconWrapper}
              hitSlop={12}
            >
              <Icon
                name="info-circle"
                size={20}
                color={
                  isInfoModalVisible
                    ? theme.colors.library.orange[500]
                    : theme.colors.library.gray[300]
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* --- Techniques List --- */}
      <View style={styles.list}>
        {techniques.map((tech, index) => {
          const displayLevel =
            {
              [TECHNIQUE_LEVEL_ENUM.BEGINNER]: "Foundation",
              [TECHNIQUE_LEVEL_ENUM.INTERMEDIATE]: "Build",
              [TECHNIQUE_LEVEL_ENUM.ADVANCED]: "Deep Practice",
            }[tech.level] || "Foundation";

          const isHero = isUnderstanding && index === 0;

          return (
            <TechniqueCard
              key={tech.id}
              title={tech.name}
              description={tech.description}
              level={displayLevel}
              hasFree={tech.hasFree}
              isPaidUser={isPaidUser}
              onPressStart={() => onTechniqueSelect(tech)}
              variant={isHero ? "hero" : "standard"}
            />
          );
        })}
      </View>

      {/* --- Info Bottom Sheet --- */}
      <BottomSheetModal
        visible={isInfoModalVisible}
        onClose={() => setIsInfoModalVisible(false)}
        maxHeight={450}
      >
        <View style={styles.modalContent}>
          {/* Header Graphic */}
          <LinearGradient
            colors={["#FFF7ED", "#FFEDD5"]}
            style={styles.modalIconBubble}
          >
            <Icon
              name={getHeaderIcon()}
              size={32}
              color={theme.colors.library.orange[500]}
            />
          </LinearGradient>

          <Text style={styles.modalTitle}>{title}</Text>
          {subtitle && <Text style={styles.modalSubtitle}>{subtitle}</Text>}

          <View style={styles.divider} />

          <Text style={styles.modalBody}>{aboutText}</Text>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsInfoModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>
    </View>
  );
};

export default LibrarySection;

const styles = StyleSheet.create({
  container: {
    marginBottom: 40,
    position: "relative",
    overflow: "hidden", // Clip watermark
  },
  watermarkContainer: {
    position: "absolute",
    right: -20,
    top: 10,
    zIndex: -1,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  titleColumn: {
    // marginBottom: 8,
  },
  subtitlePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
    marginBottom: 8,
  },
  subtitleText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.library.gray[500],
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  mainTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFEDD5", // Orange 100
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#111827", // Gray 900
    fontSize: 22,
    flex: 1,
    lineHeight: 28,
  },
  infoIconWrapper: {
    padding: 8,
  },
  list: {
    paddingHorizontal: 24,
    gap: 16,
  },

  // Modal Styles
  modalContent: {
    padding: 24,
    alignItems: "center",
    paddingBottom: 40,
  },
  modalIconBubble: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FED7AA", // Orange 200
  },
  modalTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#1F2937",
    marginBottom: 4,
    textAlign: "center",
  },
  modalSubtitle: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.library.gray[500],
    textTransform: "uppercase",
    fontWeight: "700",
    fontSize: 11,
    marginBottom: 24,
    textAlign: "center",
  },
  divider: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.library.gray[200],
    borderRadius: 2,
    marginBottom: 24,
  },
  modalBody: {
    ...parseTextStyle(theme.typography.Body),
    color: "#4B5563",
    fontSize: 16,
    lineHeight: 26,
    textAlign: "center",
    marginBottom: 32,
  },
  closeButton: {
    backgroundColor: theme.colors.library.orange[500],
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: theme.colors.library.orange[400],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  closeButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
});
