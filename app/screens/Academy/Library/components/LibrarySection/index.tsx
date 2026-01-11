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

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface LibrarySectionProps {
  sectionId?: string; // New prop for specific styling logic
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
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  if (techniques.length === 0) return null;

  // Bento Grid Logic:
  // If "UNDERSTANDING", first item is Hero.
  const isUnderstanding = sectionId === "UNDERSTANDING";

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

      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.headerTopRow}>
          <Text style={styles.title}>{title}</Text>
        </View>

        <TouchableOpacity onPress={toggleExpand} style={styles.aboutToggle}>
          <Text style={styles.aboutToggleText}>About this category</Text>
          <Icon
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={10}
            color={theme.colors.library.orange[500]}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.aboutContent}>
            <Text style={styles.aboutText}>{aboutText}</Text>
          </View>
        )}
      </View>

      {/* Techniques List */}
      <View style={styles.list}>
        {techniques.map((tech, index) => {
          // Map level enum to display string
          const displayLevel =
            {
              [TECHNIQUE_LEVEL_ENUM.BEGINNER]: "Foundation",
              [TECHNIQUE_LEVEL_ENUM.INTERMEDIATE]: "Build",
              [TECHNIQUE_LEVEL_ENUM.ADVANCED]: "Deep Practice",
            }[tech.level] || "Foundation";

          // Bento Logic: First item of Understanding is Hero
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
    marginBottom: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    fontSize: 24, // Slightly larger
  },
  subtitle: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.library.gray[500],
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontSize: 11,
  },
  aboutToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255, 144, 64, 0.08)", // distinct bg
    borderRadius: 20,
  },
  aboutToggleText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.library.orange[600],
    fontWeight: "600",
    fontSize: 12,
  },
  aboutContent: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.7)", // semi-transparent
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.library.orange[300],
  },
  aboutText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    lineHeight: 20,
  },
  list: {
    paddingHorizontal: 24,
    gap: 16, // using gap from ListCard container
  },
});
