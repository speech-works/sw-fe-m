import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  TECHNIQUE_LEVEL_ENUM,
  TransformedTechnique,
} from "../../../../../api/library/types";
import BottomSheetModal from "../../../../../components/BottomSheetModal";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import TechniqueCard from "../TechniqueCard";

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
        showCloseButton={true}
      >
        {/* Redesigned Premium Glassmorphic Modal Content */}
        <LinearGradient
          colors={["#FFFCF9", "#FFF7ED"]} // Soft beige gradient
          style={styles.modalGradientContainer}
        >
          {/* Watermark Background */}
          <View style={styles.modalWatermark} pointerEvents="none">
            <Icon
              name={getHeaderIcon()}
              size={180}
              color={theme.colors.library.orange[200]}
              style={{ opacity: 0.25, transform: [{ rotate: "-15deg" }] }}
            />
          </View>

          <Text style={styles.modalTitle}>{title}</Text>
          {subtitle && (
            <Text style={styles.modalSubtitle}>{subtitle.toUpperCase()}</Text>
          )}

          <View style={styles.divider} />

          <Text style={styles.modalBody}>{aboutText}</Text>

          {/* Standard Primary Action Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsInfoModalVisible(false)}
            style={styles.standardButtonWrapper}
          >
            <LinearGradient
              colors={[
                theme.colors.actionPrimary.default,
                theme.colors.actionPrimary.default,
              ]} // Consistently use primary action color
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Got it</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
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

  // Premium Modal Styles
  modalGradientContainer: {
    padding: 32, // Increased padding
    alignItems: "center",
    paddingBottom: 48,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    position: "relative",
    overflow: "hidden", // Clip watermark
  },
  modalWatermark: {
    position: "absolute",
    right: -40,
    top: -20,
    zIndex: 0,
  },
  modalTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#111827",
    fontSize: 28, // Bold & Large
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.5,
    zIndex: 1,
    marginTop: 20,
  },
  modalSubtitle: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.library.gray[400],
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 1.5, // Spaced out
    marginBottom: 24,
    textAlign: "center",
    zIndex: 1,
  },
  divider: {
    width: 60,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.04)", // Very subtle
    borderRadius: 2,
    marginBottom: 32,
    zIndex: 1,
  },
  modalBody: {
    ...parseTextStyle(theme.typography.Body),
    color: "#374151", // Gray 700
    fontSize: 17, // Larger body
    lineHeight: 28,
    fontWeight: "400",
    textAlign: "center",
    marginBottom: 40,
    opacity: 0.9,
    zIndex: 1,
  },
  standardButtonWrapper: {
    width: "100%",
    maxWidth: 280,
    shadowColor: theme.colors.actionPrimary.default,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    borderRadius: 30,
    zIndex: 1,
  },
  closeButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
